// The viewer: the painted pyramid on one canvas, panned by drag (with a flick's glide), zoomed by
// wheel, pinch, buttons and keys, with the places named over it, a minimap and a shareable spot.

import "./style.css";
import { toCanvas } from "./lib/grid";
import { PLACES } from "./lib/places";
import { levelFor, parentOf, tilesIn } from "./lib/pyramid";
import type { Manifest } from "./lib/pyramid";
import {
  clampView,
  fitZoom,
  formatHash,
  parseHash,
  toScreen,
  toWorld,
  visibleRect,
  zoomAt,
} from "./lib/view";
import type { View } from "./lib/view";

const BASE = (import.meta.env.VITE_TILES_URL ?? "/data").replace(/\/$/u, "");

const byId = <T extends HTMLElement>(id: string, kind: new () => T) => {
  const el = document.querySelector(`#${id}`);
  if (!(el instanceof kind)) {
    throw new Error(`#${id} is missing`);
  }
  return el;
};

const canvas = byId("map", HTMLCanvasElement);
const minimap = byId("minimap", HTMLCanvasElement);
const ctx = canvas.getContext("2d");
const mini = minimap.getContext("2d");
if (!(ctx && mini)) {
  throw new Error("no 2d canvas");
}

const response = await fetch(`${BASE}/manifest.json`).catch(() => null);
const manifest: Manifest | null = response?.ok ? await response.json() : null;
if (!manifest) {
  byId("empty", HTMLDivElement).hidden = false;
}

// ---- tiles: fetched once, decoded off the main thread ------------------------------------------

const bitmaps = new Map<string, ImageBitmap | "loading" | "missing">();
const has = manifest ? manifest.levels.map((keys) => new Set(keys)) : [];

let dirty = true;
const redraw = () => {
  dirty = true;
};

const fetchTile = async (key: string) => {
  try {
    const r = await fetch(`${BASE}/${key}.webp`);
    if (!r.ok) {
      throw new Error(String(r.status));
    }
    bitmaps.set(key, await createImageBitmap(await r.blob()));
    redraw();
  } catch {
    bitmaps.set(key, "missing");
  }
};

const load = (level: number, x: number, y: number) => {
  const key = `${level}/${x}_${y}`;
  if (bitmaps.has(key)) {
    return bitmaps.get(key);
  }
  if (!has[level]?.has(`${x}_${y}`)) {
    bitmaps.set(key, "missing");
    return "missing";
  }
  bitmaps.set(key, "loading");
  void fetchTile(key);
  return "loading";
};

// ---- view ---------------------------------------------------------------------------------------

const screen = { h: window.innerHeight, w: window.innerWidth };
const bounds = manifest?.bounds ?? { h: 1, w: 1, x: 0, y: 0 };
const home = (): View => ({
  x: bounds.x + bounds.w / 2,
  y: bounds.y + bounds.h / 2,
  zoom: fitZoom(bounds, screen),
});
// the first look: the Ferry Building close up, so the style reads before the city does
const first = (): View => {
  const [ferry] = PLACES;
  if (!(manifest && ferry)) {
    return home();
  }
  const at = toCanvas(manifest.projection, ferry.lat, ferry.lon, ferry.height);
  return { ...at, zoom: 0.5 };
};

let view = clampView(parseHash(location.hash) ?? first(), bounds, screen);
const setView = (next: View) => {
  view = clampView(next, bounds, screen);
  redraw();
};

let trip: { from: View; to: View; start: number } | null = null;

// the pointers down, a flick's glide and the drag's last moves (for the flick)
const pointers = new Map<number, { x: number; y: number }>();
let glide = { vx: 0, vy: 0 };
let trail: { t: number; x: number; y: number }[] = [];
const moving = () => trip !== null || pointers.size > 0 || Math.hypot(glide.vx, glide.vy) > 0.01;

// a trip there: zoom out on the way when it's far, like map apps do
const flyTo = (to: View) => {
  // a trip takes over from a flick's glide, or the glide would carry the camera off its target
  glide = { vx: 0, vy: 0 };
  trip = { from: view, start: performance.now(), to: clampView(to, bounds, screen) };
  redraw();
};
const TRIP_MS = 900;
const stepTrip = (now: number) => {
  if (!trip) {
    return;
  }
  const t = Math.min(1, (now - trip.start) / TRIP_MS);
  const e = t < 0.5 ? 4 * t ** 3 : 1 - (-2 * t + 2) ** 3 / 2;
  const { from, to } = trip;
  const far = (Math.hypot(to.x - from.x, to.y - from.y) * Math.min(from.zoom, to.zoom)) / screen.w;
  const bump = far > 1 ? Math.sin(t * Math.PI) * Math.log(far) : 0;
  setView({
    x: from.x + (to.x - from.x) * e,
    y: from.y + (to.y - from.y) * e,
    zoom: Math.exp(Math.log(from.zoom) + (Math.log(to.zoom) - Math.log(from.zoom)) * e - bump),
  });
  if (t === 1) {
    trip = null;
  }
};

// ---- drawing ------------------------------------------------------------------------------------

const dpr = () => Math.min(2, window.devicePixelRatio || 1);

const resize = () => {
  screen.w = window.innerWidth;
  screen.h = window.innerHeight;
  canvas.width = Math.round(screen.w * dpr());
  canvas.height = Math.round(screen.h * dpr());
  minimap.width = minimap.clientWidth * dpr();
  minimap.height = minimap.clientHeight * dpr();
  setView(view);
};

// a tile, or the part of a coarser one that covers it while it loads
const drawTile = (level: number, x: number, y: number, size: number) => {
  let tx = x;
  let ty = y;
  for (let up = level; up < (manifest?.levels.length ?? 0); up += 1) {
    const bitmap = load(up, tx, ty);
    if (bitmap instanceof ImageBitmap) {
      const scale = 2 ** (up - level);
      const piece = (manifest?.tile ?? 512) / scale;
      const sx = (x - tx * scale) * piece;
      const sy = (y - ty * scale) * piece;
      // whole pixels at both ends, so neighbouring tiles meet with no hairline between them
      const a = toScreen(view, screen, x * size, y * size);
      const b = toScreen(view, screen, (x + 1) * size, (y + 1) * size);
      const r = dpr();
      const left = Math.round(a.x * r) / r;
      const top = Math.round(a.y * r) / r;
      ctx.drawImage(
        bitmap,
        sx,
        sy,
        piece,
        piece,
        left,
        top,
        Math.round(b.x * r) / r - left,
        Math.round(b.y * r) / r - top,
      );
      return;
    }
    ({ x: tx, y: ty } = parentOf({ x: tx, y: ty }));
  }
};

const LABEL_ZOOM = 0.12;

const drawPlaces = () => {
  if (!manifest || view.zoom < LABEL_ZOOM) {
    return;
  }
  ctx.font = "500 12px Geist, system-ui, sans-serif";
  const taken: { x: number; y: number; w: number }[] = [];
  for (const place of PLACES) {
    const c = toCanvas(manifest.projection, place.lat, place.lon, place.height);
    const painted =
      c.x >= bounds.x && c.y >= bounds.y && c.x < bounds.x + bounds.w && c.y < bounds.y + bounds.h;
    if (!painted) {
      continue;
    }
    const at = toScreen(view, screen, c.x, c.y);
    const w = ctx.measureText(place.name).width + 16;
    const clash = taken.some(
      (t) => Math.abs(t.x - at.x) < (t.w + w) / 2 && Math.abs(t.y - at.y) < 26,
    );
    if (clash || at.x < -w || at.y < -30 || at.x > screen.w + w || at.y > screen.h + 30) {
      continue;
    }
    taken.push({ w: w + 14, x: at.x + w / 2 + 7, y: at.y });
    ctx.fillStyle = "#e8572a";
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(at.x, at.y, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = "rgb(255 255 255 / 0.94)";
    ctx.beginPath();
    ctx.roundRect(at.x + 9, at.y - 11, w, 22, 11);
    ctx.fill();
    ctx.fillStyle = "#1d2327";
    ctx.fillText(place.name, at.x + 17, at.y + 4);
  }
};

let minimapScale = { ox: 0, oy: 0, s: 1 };

const drawMinimap = () => {
  if (!manifest) {
    return;
  }
  const r = dpr();
  const w = minimap.width;
  const h = minimap.height;
  const s = Math.min(w / bounds.w, h / bounds.h) * 0.92;
  const ox = (w - bounds.w * s) / 2 - bounds.x * s;
  const oy = (h - bounds.h * s) / 2 - bounds.y * s;
  mini.clearRect(0, 0, w, h);
  const top = manifest.levels.length - 1;
  const size = manifest.tile * 2 ** top;
  for (const key of manifest.levels[top] ?? []) {
    const [x = 0, y = 0] = key.split("_").map(Number);
    const bitmap = load(top, x, y);
    if (bitmap instanceof ImageBitmap) {
      mini.drawImage(bitmap, ox + x * size * s, oy + y * size * s, size * s, size * s);
    }
  }
  const v = visibleRect(view, screen);
  mini.strokeStyle = "#e8572a";
  mini.lineWidth = 2 * r;
  mini.strokeRect(ox + v.x * s, oy + v.y * s, v.w * s, v.h * s);
  minimapScale = { ox, oy, s: s / r };
};

const draw = () => {
  ctx.setTransform(dpr(), 0, 0, dpr(), 0, 0);
  ctx.clearRect(0, 0, screen.w, screen.h);
  if (manifest) {
    const level = levelFor(view.zoom * dpr(), manifest.levels.length);
    const size = manifest.tile * 2 ** level;
    // while it moves, plain bilinear; sharp once it stops
    ctx.imageSmoothingQuality = moving() ? "low" : "high";
    for (const t of tilesIn(visibleRect(view, screen), level, manifest.tile)) {
      drawTile(level, t.x, t.y, size);
    }
  }
  drawPlaces();
  drawMinimap();
};

// ---- input --------------------------------------------------------------------------------------

canvas.addEventListener("pointerdown", (e) => {
  canvas.setPointerCapture(e.pointerId);
  pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
  canvas.classList.add("dragging");
  trip = null;
  glide = { vx: 0, vy: 0 };
  trail = [{ t: e.timeStamp, x: e.clientX, y: e.clientY }];
});

canvas.addEventListener("pointermove", (e) => {
  const last = pointers.get(e.pointerId);
  if (!last) {
    return;
  }
  const now = { x: e.clientX, y: e.clientY };
  if (pointers.size === 2) {
    // pinch: the distance between the fingers zooms about their middle, which pans with them
    const other = [...pointers.entries()].find(([id]) => id !== e.pointerId)?.[1];
    if (other) {
      const before = Math.hypot(last.x - other.x, last.y - other.y);
      const after = Math.hypot(now.x - other.x, now.y - other.y);
      const mid = { x: (now.x + other.x) / 2, y: (now.y + other.y) / 2 };
      const zoomed = zoomAt(view, screen, after / Math.max(1, before), mid.x, mid.y);
      setView({
        ...zoomed,
        x: zoomed.x - (now.x - last.x) / 2 / zoomed.zoom,
        y: zoomed.y - (now.y - last.y) / 2 / zoomed.zoom,
      });
    }
  } else {
    setView({
      ...view,
      x: view.x - (now.x - last.x) / view.zoom,
      y: view.y - (now.y - last.y) / view.zoom,
    });
    trail = [...trail.filter((p) => e.timeStamp - p.t < 90), { t: e.timeStamp, ...now }];
  }
  pointers.set(e.pointerId, now);
});

const release = (e: PointerEvent) => {
  pointers.delete(e.pointerId);
  if (pointers.size > 0) {
    trail = [];
    return;
  }
  canvas.classList.remove("dragging");
  // a flick keeps the map gliding: the velocity over the drag's last ~90 ms
  const [a, b] = [trail[0], trail.at(-1)];
  if (a && b && b.t > a.t && e.timeStamp - b.t < 50) {
    glide = {
      vx: -(b.x - a.x) / (b.t - a.t) / view.zoom,
      vy: -(b.y - a.y) / (b.t - a.t) / view.zoom,
    };
  }
  redraw();
};
canvas.addEventListener("pointerup", release);
canvas.addEventListener("pointercancel", release);

canvas.addEventListener(
  "wheel",
  (e) => {
    e.preventDefault();
    trip = null;
    // a trackpad pinch arrives as a wheel with ctrl held; both zoom about the pointer
    const factor = Math.exp(-e.deltaY * (e.ctrlKey ? 0.01 : 0.0015));
    setView(zoomAt(view, screen, factor, e.clientX, e.clientY));
  },
  { passive: false },
);

canvas.addEventListener("dblclick", (e) => {
  const at = toWorld(view, screen, e.clientX, e.clientY);
  flyTo({ ...at, zoom: view.zoom * 2 });
});

const zoomBy = (factor: number) => flyTo({ ...view, zoom: view.zoom * factor });
byId("zoom-in", HTMLButtonElement).addEventListener("click", () => zoomBy(2));
byId("zoom-out", HTMLButtonElement).addEventListener("click", () => zoomBy(0.5));
byId("home", HTMLButtonElement).addEventListener("click", () => flyTo(home()));
byId("share", HTMLButtonElement).addEventListener("click", async () => {
  const url = `${location.origin}${location.pathname}${formatHash(view)}`;
  try {
    await navigator.clipboard.writeText(url);
  } catch {
    location.hash = formatHash(view);
  }
});

window.addEventListener("keydown", (e) => {
  if (e.target instanceof HTMLInputElement) {
    return;
  }
  const pan = 160 / view.zoom;
  const moves = new Map<string, () => View>([
    ["+", () => ({ ...view, zoom: view.zoom * 2 })],
    ["-", () => ({ ...view, zoom: view.zoom / 2 })],
    ["=", () => ({ ...view, zoom: view.zoom * 2 })],
    ["ArrowDown", () => ({ ...view, y: view.y + pan })],
    ["ArrowLeft", () => ({ ...view, x: view.x - pan })],
    ["ArrowRight", () => ({ ...view, x: view.x + pan })],
    ["ArrowUp", () => ({ ...view, y: view.y - pan })],
  ]);
  const move = moves.get(e.key);
  if (move) {
    e.preventDefault();
    flyTo(move());
  }
});

minimap.addEventListener("click", (e) => {
  const box = minimap.getBoundingClientRect();
  const r = dpr();
  flyTo({
    ...view,
    x: (e.clientX - box.left - minimapScale.ox / r) / minimapScale.s,
    y: (e.clientY - box.top - minimapScale.oy / r) / minimapScale.s,
  });
});

// search: the named places; picking one flies there
const list = byId("places", HTMLDataListElement);
list.append(
  ...PLACES.map((p) => Object.assign(document.createElement("option"), { value: p.name })),
);
byId("search", HTMLFormElement).addEventListener("submit", (e) => {
  e.preventDefault();
  const q = byId("query", HTMLInputElement).value.trim().toLowerCase();
  const place = PLACES.find((p) => p.name.toLowerCase().includes(q));
  if (place && manifest && q) {
    flyTo({ ...toCanvas(manifest.projection, place.lat, place.lon, place.height), zoom: 0.6 });
  }
});

window.addEventListener("resize", resize);
window.addEventListener("hashchange", () => {
  const next = parseHash(location.hash);
  if (next) {
    flyTo(next);
  }
});

// ---- the frame loop: draws only when something moved, loaded or changed -------------------------

let hashTimer = 0;
const loop = (now: number) => {
  stepTrip(now);
  if (pointers.size === 0 && Math.hypot(glide.vx, glide.vy) > 0.01) {
    setView({ ...view, x: view.x + glide.vx * 16, y: view.y + glide.vy * 16 });
    glide = { vx: glide.vx * 0.92, vy: glide.vy * 0.92 };
  }
  if (dirty) {
    dirty = false;
    draw();
    window.clearTimeout(hashTimer);
    hashTimer = window.setTimeout(() => history.replaceState(null, "", formatHash(view)), 300);
  }
  requestAnimationFrame(loop);
};

resize();
requestAnimationFrame(loop);
