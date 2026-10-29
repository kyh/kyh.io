# kyh (`apps/kyh`)

The main website, and the agent-facing surface. Rules and where things live;
how a feature behaves is in its code.

## Pages and the agent surface

- `src/lib/config.ts` is the one list of canonical routes. Add a page there and
  it appears in the sitemap, `llms.txt`, the homepage nav and the 404 links.
- `src/lib/` holds the pure builders behind `/markdown`, `/llms.txt`, the
  JSON-LD graph and the 404 body, each tested beside it.
- Every page shares one `og:video` and its poster as `og:image`: the
  showcase's opening, recorded per theme (`pnpm og:video kyh`), picked by
  `src/lib/todays-video.ts`.

## Themes (`src/themes/`)

- `store.ts` owns the theme (no next-themes): the calendar's for today, unless
  the menu picked another (gone on reload), else the visitor's light or dark
  (localStorage `theme`, or the system's). `paint.ts` paints `data-theme`,
  `color-scheme`, the tint and `<meta name="theme-color">`; a test holds
  `barColor` to `global.css`. `script.ts` paints the same before first paint;
  a test holds it to the store day by day.
- One folder per theme. `index.ts` exports its `theme` (`Theme` in
  `theme.ts`, registry `THEMES`, in calendar order); `town.ts` exports its
  `town` (`Town` in `city/town-theme.ts`, registry `TOWNS`, keyed by theme so
  a missing one won't compile).
- Keep `town` out of `index.ts`: Turbopack keeps a module's imports whole, so
  the town's drawing code would ship on every page instead of only `/showcase`.
- Adding a theme: its folder, plus a line in each registry. Adding an effect: a
  field on `Theme` or `Town`, a value in each theme, a read where it shows.
- No theme's days may run past December 31st: the calendar only looks in the
  day's own year. A test holds every theme to it.
- Theme art (`art.ts`, drawn by `piece.tsx`) is drawn in the showcase town's
  hand: flat faces in its palette tokens, ink outlines, the shaded side in the
  darker token with the shade dots. No gradients, gloss or drop shadows.
- The homepage hat is pictured on the server (`themes/hat-pictures.ts` →
  `city/picture.ts`), so the page loads no town code.

## Showcase (`src/app/showcase/_components/city/`)

An isometric three.js town of the projects in `src/lib/data.ts`. Every
project gets a building: a bespoke one when its slug is in
`draw-landmarks.ts`, else a generic one.

- `plan.ts`: the island, roads and lots. Pure, tested.
- `sketch.ts`: faces and ink per view. `render.ts`: sketch → three.js.
- `town-views.ts`: one drawing per camera heading. It keeps the ones near the
  camera, draws the next ones a few ms a frame, and repaints only on change.
- `camera.ts`: view, zoom limits, pan, zoom, glide, key steering, rays.
- `flyover.ts`: the tour path and the camera carried along it.
- `pins.ts`: the favicon links floating over roofs.
- `controls.ts`: what's lit, when the flyover runs, tap vs drag vs pinch, the
  keys. Pure, tested.
- `engine.ts`: glue. Renderer, input, the loop, the API React calls.
- `world.ts` / `traffic.ts` / `visitors.ts`: cars and people stepped in fixed
  20Hz ticks with seeded randomness, so every browser stepping the same
  snapshot gets the same town. Pure, tested. `life.ts` draws them; `net.ts`
  shares them on the vibedgames party server (`src/lib/party.ts`).
- **Bump `TOWN_VERSION` whenever stepping or packing changes.** Rooms are
  named by it, and old and new pages in one room desync.
- The town is grey; theme colors and hover tints come from a `Scheme`
  (`palette.ts`, `schemeOf` in `town-theme.ts`).
- Dev: `window.city.look(x, z, zoom)` moves the camera, `window.city.debug()`
  reports the town. Headless Chromium needs
  `--use-angle=swiftshader,--enable-unsafe-swiftshader` for WebGL.

## Multiplayer

- The rest of the site shares one room, `kyh-site`: `src/lib/site-room.ts` is
  the store (no React), `components/multiplayer/provider.tsx` exposes hooks.
  Host-side features are a fixed slice table, since the host may be on any
  page.
- `components/multiplayer/cursors.tsx` skips `/showcase`, which draws its own.
- `src/lib/chat.ts` holds the chat rules for both rooms. The visitor's own
  pointer lives in `src/lib/pointer.ts`.
- The homepage grid order is shared (`useSharedOrder`, `shared-order.ts`,
  pure, tested). `side-quests-grid.tsx` is the one place grids meet the room.

## Easter eggs (`src/easter-eggs/`)

`store.ts` lists them and keeps finds in memory only. A find is one
`discoverEgg(id)` where it hides (grep for it). A touch-only device skips the
chat egg (`huntedEggs`). Finding them all turns the visitor's color `gold`.
