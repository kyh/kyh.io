# tiny bay

San Francisco as one isometric map, after [tinygyn](https://tinygyn.com). Every frame is drawn
from open data through one orthographic camera (45° down, looking north, 0.25 m a pixel): no
keys, no accounts. An image model can repaint it on top, optionally.

```sh
pnpm -F @repo/bay render --area ferry       # 1. open data → data/render/ (no keys)
pnpm -F @repo/bay pyramid                   # 2. cut → public/data/
pnpm dev:bay                                # → http://localhost:3017

# optional: repaint with an image model, either with a local agent (Codex: CODEX.md is its
# brief, no key here) ...
pnpm -F @repo/bay jobs --area ferry         #    fold in its paintings, lay out the next wave
# ... or straight through the OpenAI API (OPENAI_API_KEY in .env)
pnpm -F @repo/bay paint --area ferry        #    the plan and its cost (dry run)
pnpm -F @repo/bay paint --area ferry --go   #    paint → data/mosaic/
# then
pnpm -F @repo/bay pyramid --from=paint      #    cut the painted map instead
```

Areas: `ferry` (20 tiles round the Ferry Building), `downtown`, `sf` (the whole city, ~1,500
tiles with the water round it); or a rectangle, `--tiles=-2,-1:2,1` (with `=`, since the value
starts with a minus). `--limit n` stops after n tiles and `--force` redoes tiles already done.
Every step skips work already on disk, so an interrupted run picks up where it stopped.

## Where the map comes from

All open, keyless, fetched once and kept in `data/source/` (`pipeline/source.ts`):

- [DataSF building footprints](https://data.sfgov.org/d/ynuv-fyni): every building with its
  LiDAR-measured roof height.
- [DataSF street trees](https://data.sfgov.org/d/tkzw-k3nq): ~190,000 trees with their trunk
  sizes; parks and woods grow their own on a seeded grid.
- [OpenFreeMap](https://openfreemap.org) vector tiles (OpenStreetMap): water, parks, grass,
  sand, piers, roads and rail.
- [AWS Terrain Tiles](https://registry.opendata.aws/terrain-tiles/): the ground's heights, so
  the hills stand.

Each frame's scene is built in local metres (`src/lib/scene.ts`) and drawn by three.js in
headless Chrome (`render.html`, `src/render/`): the ground painted onto the terrain, buildings
with windowed walls, edges and rooftop kit, round canopies, a low afternoon sun with shadows.
Every colour is in `src/render/style.ts`. About 5 seconds a tile.

## Painting (optional)

The canvas is cut into 768 px cores, and each tile's frame is its core plus 128 px round it
(1024 px). Tiles are painted out from the Ferry Building, ring by ring, so every tile after the
first has a painted neighbour. The model gets the frame's render with whatever's already painted
pasted over it, a mask keeping the painted part, and the prompt in `pipeline/prompt.ts`. Its
answer goes back into the mosaic in full over the core and fading out across the margin, so it
blends into the neighbours it carried on from (`src/lib/paint.ts`, tested). About $0.20 a tile
(`paint` prints the estimate before spending): `ferry` ~$4, all of `sf` ~$300.

With an agent, the same frames go out as jobs in waves (`pipeline/jobs.ts`): each run folds in
the `output.png` files saved since the last one and lays out the next wave in `data/jobs/`, a
folder a tile with its `input.png`, `mask.png` (white keeps) and `job.md`. A wave's tiles never
touch, so they can be painted in any order. Point the agent at `CODEX.md`.

`STYLE_REFERENCE` sends a picture of the look with every frame (or job). The first tiles set the style
for everything after them, so paint `ferry`, look at it, adjust the prompt, and repaint it with
`--force` before going bigger.

## Serving

`public/data/` is gitignored. To deploy, upload it to Vercel Blob or any CDN and set
`VITE_TILES_URL` to where it lives.

## Caveats

- OpenStreetMap data is ODbL: keep the credit the viewer shows.
- Bridges draw flat on the water, and a building is one block at its median roof height, so
  spires and towers on top (the Ferry Building's clock tower) don't show.
- The buildings and trees are DataSF's, so outside San Francisco the map has ground and roads
  only.
