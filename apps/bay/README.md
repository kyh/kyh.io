# tiny bay

San Francisco as one painted isometric map, after [tinygyn](https://tinygyn.com): Google's
photorealistic 3D tiles rendered through one orthographic camera (45° down, looking north,
0.25 m a pixel), each frame repainted by an image model, and the frames feathered into one
picture served as a tile pyramid.

```sh
cp apps/bay/.env.example apps/bay/.env      # GOOGLE_MAPS_API_KEY, OPENAI_API_KEY
pnpm -F @repo/bay render --area ferry       # 1. Google 3D tiles → data/render/
pnpm -F @repo/bay paint --area ferry        #    the plan and its cost (dry run)
pnpm -F @repo/bay paint --area ferry --go   # 2. paint → data/mosaic/
pnpm -F @repo/bay pyramid                   # 3. cut → public/data/
pnpm dev:bay                                # → http://localhost:3017
```

Areas: `ferry` (3×2 tiles round the Ferry Building, the style's test bed), `downtown`, `sf`
(the whole city, ~1,500 tiles with the water round it); or a rectangle, `--tiles -2,-1:2,1`.
`--limit n` stops after n tiles and `--force` redoes tiles already done. Every step skips work
already on disk, so an interrupted run picks up where it stopped.

## How a tile is painted

The canvas is cut into 768 px cores, and each tile's frame is its core plus 128 px round it
(1024 px). Tiles are painted out from the Ferry Building, ring by ring, so every tile after the
first has a painted neighbour. The model gets the frame's render with whatever's already painted
pasted over it, a mask keeping the painted part, and the prompt in `pipeline/prompt.ts`. Its
answer goes back into the mosaic in full over the core and fading out across the margin, so it
blends into the neighbours it carried on from (`src/lib/paint.ts`, tested).

`STYLE_REFERENCE` sends a picture of the look with every frame. The first tiles set the style
for everything after them, so paint `ferry`, look at it, adjust the prompt, and repaint it with
`--force` before going bigger.

## Cost and time

About $0.20 a tile at high quality (`paint` prints the estimate before spending), so `ferry` is
about $1, `downtown` ~$20 and all of `sf` ~$300. Renders take a few seconds a tile and paints a
minute or so.

## Serving

`public/data/` is gitignored. To deploy, upload it to Vercel Blob or any CDN and set
`VITE_TILES_URL` to where it lives.

## Caveats

- Google's Map Tiles API terms restrict storing and deriving from its tiles. tinygyn does the
  same thing, but read the terms before you publish this widely.
- The model can drift from the render's geometry. The prompt tells it not to, and the feathered
  context keeps neighbours consistent, but expect to redo some tiles with `--force --tiles i,j:i,j`.
