import { existsSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { VectorTile } from "@mapbox/vector-tile";
import type { Geometry, Position } from "geojson";
import { PbfReader } from "pbf";
import sharp from "sharp";
import { z } from "zod";
import type { Projection } from "../src/lib/grid";
import { curvature, groundBox, toLatLon, toLocal } from "../src/lib/grid";
import type { Area, Box, Building, Point, Road, Scene, Terrain, Tree } from "../src/lib/scene";
import {
  area,
  areaOf,
  canopyOf,
  crossingsOf,
  hash,
  heightAt,
  inArea,
  lookOf,
  roadOf,
  scatterTrees,
  spireOf,
  touches,
  withoutBorrowedSpires,
} from "../src/lib/scene";
import { DATA } from "./common";

const SOURCE = path.join(DATA, "source");

const VECTOR_ZOOM = 14;
const TERRAIN_ZOOM = 15;

const PAD = 80;

const HIGHEST = 600;

const STEP = 4;

const get = async (url: string) => {
  const attempt: (n: number) => Promise<Buffer> = async (n) => {
    const res = await fetch(url, { redirect: "follow" });

    if (res.ok) {
      return Buffer.from(await res.arrayBuffer());
    }

    if (n === 3 || res.status < 500) {
      throw new Error(`${url}: ${res.status}`);
    }

    return await attempt(n + 1);
  };

  return await attempt(1);
};

const cached = async (name: string, fetcher: () => Promise<Buffer>) => {
  const file = path.join(SOURCE, name);

  if (existsSync(file)) {
    return await readFile(file);
  }

  const body = await fetcher();
  await mkdir(path.dirname(file), { recursive: true });
  await writeFile(file, body);

  return body;
};

const once = <T>(make: (key: string) => Promise<T>) => {
  const known = new Map<string, Promise<T>>();

  return async (key: string) => {
    const hit = known.get(key);

    if (hit !== undefined) {
      return await hit;
    }

    const made = make(key);
    known.set(key, made);

    return await made;
  };
};

const mercator = (lat: number, lon: number, zoom: number) => {
  const n = 2 ** zoom;
  const r = (lat * Math.PI) / 180;

  return {
    x: ((lon + 180) / 360) * n,
    y: ((1 - Math.log(Math.tan(r) + 1 / Math.cos(r)) / Math.PI) / 2) * n,
  };
};

const tileBounds = (x: number, y: number, zoom: number) => {
  const n = 2 ** zoom;
  const lat = (ty: number) => (Math.atan(Math.sinh(Math.PI * (1 - (2 * ty) / n))) * 180) / Math.PI;

  return {
    east: ((x + 1) / n) * 360 - 180,
    north: lat(y),
    south: lat(y + 1),
    west: (x / n) * 360 - 180,
  };
};

const tilesFor = (proj: Projection, box: Box, zoom: number) => {
  const sw = toLatLon(proj, box.e0, box.n0);
  const ne = toLatLon(proj, box.e1, box.n1);
  const a = mercator(ne.lat, sw.lon, zoom);
  const b = mercator(sw.lat, ne.lon, zoom);
  const out: { x: number; y: number }[] = [];

  for (let y = Math.floor(a.y); y <= Math.floor(b.y); y += 1) {
    for (let x = Math.floor(a.x); x <= Math.floor(b.x); x += 1) {
      out.push({ x, y });
    }
  }

  return out;
};

const TileJson = z.object({ tiles: z.array(z.string()).min(1) });

const vectorTemplate = once(async () => {
  const body = await get("https://tiles.openfreemap.org/planet");

  return TileJson.parse(JSON.parse(body.toString())).tiles[0] ?? "";
});

interface Ground {
  areas: Area[];
  roads: Road[];
}

const polygonsOf = (geo: Geometry) => {
  if (geo.type === "Polygon") {
    return [geo.coordinates];
  }

  return geo.type === "MultiPolygon" ? geo.coordinates : [];
};

const linesOf = (geo: Geometry) => {
  if (geo.type === "LineString") {
    return [geo.coordinates];
  }

  return geo.type === "MultiLineString" ? geo.coordinates : [];
};

const groundTile = (proj: Projection) => {
  const local: (p: Position) => Point = (p) => {
    const l = toLocal(proj, p[1] ?? 0, p[0] ?? 0, 0);

    return [l[0], l[1]];
  };

  return once<Ground>(async (key) => {
    const [x = 0, y = 0] = key.split("_").map(Number);

    const body = await cached(`ofm/${VECTOR_ZOOM}/${key}.pbf`, async () => {
      const url = await vectorTemplate("planet");

      return await get(
        url.replace("{z}", String(VECTOR_ZOOM)).replace("{x}", String(x)).replace("{y}", String(y)),
      );
    });

    const tile = new VectorTile(new PbfReader(body));
    const areas: Area[] = [];
    const roads: Road[] = [];

    for (const name of ["water", "landcover", "landuse", "park", "transportation"]) {
      const layer = tile.layers[name];

      if (!layer) {
        continue;
      }

      for (let i = 0; i < layer.length; i += 1) {
        const feature = layer.feature(i);
        const cls = String(feature.properties.class ?? "");
        const geo = feature.toGeoJSON(x, y, VECTOR_ZOOM).geometry;
        const { brunnel } = feature.properties;
        const kind = name === "transportation" ? null : areaOf(name, cls);

        if (kind || (cls === "pier" && name === "transportation")) {
          areas.push(
            ...polygonsOf(geo).map((rings) => ({
              kind: kind ?? ("pier" as const),
              rings: rings.map((r) => r.map(local)),
            })),
          );
        }

        const road = name === "transportation" && brunnel !== "tunnel" ? roadOf(cls) : null;

        if (road) {
          roads.push(
            ...linesOf(geo).map((line) => ({
              ...road,
              bridge: brunnel === "bridge",
              line: line.map(local),
            })),
          );
        }
      }
    }

    return { areas, roads };
  });
};

const demTile = once(async (key) => {
  const [x, y] = key.split("_");

  const body = await cached(
    `dem/${TERRAIN_ZOOM}/${key}.png`,
    async () =>
      await get(
        `https://s3.amazonaws.com/elevation-tiles-prod/terrarium/${TERRAIN_ZOOM}/${x}/${y}.png`,
      ),
  );

  return new Uint8Array(await sharp(body).removeAlpha().raw().toBuffer());
});

const elevation = async (lat: number, lon: number) => {
  const m = mercator(lat, lon, TERRAIN_ZOOM);
  const tx = Math.floor(m.x);
  const ty = Math.floor(m.y);
  const px = Math.min(255, Math.floor((m.x - tx) * 256));
  const py = Math.min(255, Math.floor((m.y - ty) * 256));
  const rgb = await demTile(`${tx}_${ty}`);
  const p = (py * 256 + px) * 3;
  const h = (rgb[p] ?? 0) * 256 + (rgb[p + 1] ?? 0) + (rgb[p + 2] ?? 0) / 256 - 32_768;

  return Math.max(0, h);
};

const terrainFor: (proj: Projection, box: Box) => Promise<Terrain> = async (proj, box) => {
  const cols = Math.ceil((box.e1 - box.e0) / STEP) + 1;
  const rows = Math.ceil((box.n1 - box.n0) / STEP) + 1;

  const points = Array.from({ length: rows * cols }, (_, k) => ({
    e: box.e0 + (k % cols) * STEP,
    n: box.n0 + Math.floor(k / cols) * STEP,
  }));

  const heights = await Promise.all(
    points.map(async ({ e, n }) => {
      const { lat, lon } = toLatLon(proj, e, n);

      return (await elevation(lat, lon)) + curvature(e, n);
    }),
  );

  return { cols, e0: box.e0, heights, n0: box.n0, rows, step: STEP };
};

const Footprint = z.object({
  footprint: z.object({
    coordinates: z.array(z.array(z.array(z.array(z.number())))),
    type: z.literal("MultiPolygon"),
  }),
  median_1st_m: z.coerce.number(),
  peak_1st_m: z.coerce.number().optional(),
  sf16_bldgid: z.string(),
});

const StreetTree = z.object({
  latitude: z.coerce.number(),
  longitude: z.coerce.number(),
  mapdbh: z.coerce.number().optional(),
  treeid: z.string(),
});

const Rows = z.array(z.unknown());

type Within = (b: { north: number; south: number; east: number; west: number }) => string;

const byGeometry: (column: string) => Within = (column) => (b) =>
  `within_box(${column}, ${b.north}, ${b.west}, ${b.south}, ${b.east})`;

const byNumbers: Within = (b) =>
  `latitude::number between ${b.south} and ${b.north} and longitude::number between ${b.west} and ${b.east}`;

const socrata = async (dataset: string, within: Within, select: string, key: string) => {
  const [x = 0, y = 0] = key.split("_").map(Number);
  const b = tileBounds(x, y, VECTOR_ZOOM);

  const body = await cached(
    `datasf/${dataset}/${hash(select)}/${VECTOR_ZOOM}_${key}.json`,
    async () => {
      const from: (offset: number) => Promise<unknown[]> = async (offset) => {
        const query = new URLSearchParams({
          $limit: "50000",
          $offset: String(offset),
          $order: ":id",
          $select: select,
          $where: within(b),
        });

        const page = await get(`https://data.sf.gov/resource/${dataset}.json?${query}`);
        const list = Rows.parse(JSON.parse(page.toString()));

        return list.length < 50_000 ? list : [...list, ...(await from(offset + 50_000))];
      };

      return Buffer.from(JSON.stringify(await from(0)));
    },
  );

  return Rows.parse(JSON.parse(body.toString()));
};

const inBox = (box: Box, p: Point, pad = 0) =>
  p[0] >= box.e0 - pad && p[0] <= box.e1 + pad && p[1] >= box.n0 - pad && p[1] <= box.n1 + pad;

const buildingsIn = async (proj: Projection, keys: string[], box: Box, terrain: Terrain) => {
  const buildings: Building[] = [];
  const ids = new Set<string>();

  const pages = await Promise.all(
    keys.map(
      async (key) =>
        await socrata(
          "ynuv-fyni",
          byGeometry("shape"),
          "sf16_bldgid,median_1st_m,peak_1st_m,shape AS footprint",
          key,
        ),
    ),
  );

  for (const rows of pages) {
    for (const row of rows) {
      const parsed = Footprint.safeParse(row);

      if (!parsed.success || ids.has(parsed.data.sf16_bldgid)) {
        continue;
      }

      ids.add(parsed.data.sf16_bldgid);
      const polygons = parsed.data.footprint.coordinates;

      const sizes = polygons.map((poly) =>
        area((poly[0] ?? []).map((p) => [p[0] ?? 0, p[1] ?? 0] satisfies Point)),
      );

      const biggest = sizes.indexOf(Math.max(...sizes));

      for (const [n, polygon] of polygons.entries()) {
        const rings = polygon.map((r) =>
          r.map((p) => {
            const l = toLocal(proj, p[1] ?? 0, p[0] ?? 0, 0);

            return [l[0], l[1]] satisfies Point;
          }),
        );

        const [outer] = rings;
        const [first] = outer ?? [];

        if (!(outer && first && touches(box, outer))) {
          continue;
        }

        const id = `${parsed.data.sf16_bldgid}:${n}`;
        const base = Math.min(...outer.map((p) => heightAt(terrain, p[0], p[1]))) - 1;
        const top = Math.max(base + 3, parsed.data.median_1st_m + curvature(first[0], first[1]));
        const look = lookOf(area(outer), top - base);
        const peak = (parsed.data.peak_1st_m ?? 0) + curvature(first[0], first[1]);
        const spire = n === biggest ? (spireOf(rings, top, peak) ?? undefined) : undefined;
        buildings.push({ base, id, look, rings, spire, tone: hash(id) % 6, top });
      }
    }
  }

  return buildings;
};

const streetTreesIn = async (proj: Projection, keys: string[], box: Box) => {
  const trees: Tree[] = [];

  const pages = await Promise.all(
    keys.map(
      async (key) => await socrata("tkzw-k3nq", byNumbers, "treeid,latitude,longitude,mapdbh", key),
    ),
  );

  for (const rows of pages) {
    for (const row of rows) {
      const parsed = StreetTree.safeParse(row);

      if (!parsed.success) {
        continue;
      }

      const [e, n] = toLocal(proj, parsed.data.latitude, parsed.data.longitude, 0);

      if (inBox(box, [e, n])) {
        const tone = hash(parsed.data.treeid) % 4;
        trees.push({ e, n, r: canopyOf(parsed.data.mapdbh ?? 6), tone });
      }
    }
  }

  return trees;
};

const grounds = new Map<Projection, ReturnType<typeof groundTile>>();

export const frameScene: (
  proj: Projection,
  rect: { x: number; y: number; w: number; h: number },
) => Promise<Scene> = async (proj, rect) => {
  const seen = groundBox(proj, rect, 0, HIGHEST);
  const box = { e0: seen.e0 - PAD, e1: seen.e1 + PAD, n0: seen.n0 - PAD, n1: seen.n1 + PAD };
  const terrain = await terrainFor(proj, box);

  const keys = tilesFor(proj, box, VECTOR_ZOOM).map((t) => `${t.x}_${t.y}`);
  const tileGround = grounds.get(proj) ?? groundTile(proj);
  grounds.set(proj, tileGround);
  const ground = await Promise.all(keys.map(tileGround));
  const areas = ground.flatMap((g) => g.areas);
  const roads = ground.flatMap((g) => g.roads).filter((r) => touches(box, r.line, 50));

  const buildings = await buildingsIn(proj, keys, box, terrain);

  const planted = scatterTrees(areas, box).filter(
    (t) => !buildings.some((b) => inArea(b.rings, t.e, t.n)),
  );

  const trees = [...(await streetTreesIn(proj, keys, box)), ...planted];

  return {
    areas,
    box,
    buildings: withoutBorrowedSpires(buildings),
    crossings: crossingsOf(roads),
    roads,
    terrain,
    trees,
  };
};
