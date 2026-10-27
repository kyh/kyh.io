# kyh.io Monorepo

Personal monorepo. Uses pnpm workspaces + turborepo.

## Commands

```bash
pnpm dev:<app>     # dev server for specific app
pnpm build         # build all
pnpm verify        # typecheck · lint · format · test — run before committing
pnpm lint          # lint all (oxlint)
pnpm typecheck     # typecheck all
pnpm format        # check formatting (oxfmt); format:fix writes
pnpm test          # run tests (apps/autoplay, apps/bay, apps/vis-ml, apps/policingice, apps/kyh, apps/commuting-clawders/mod, apps/mod-dev)
```

## Agent-driven development

`AGENTS.md` is the full workflow — read it first. The essentials:

- **Setup**: `pnpm install`, then `pnpm dev:<app>`. No bootstrap script, no Docker. `pnpm dev:kyh` and `pnpm dev:policingice` both bind :3000, so run one at a time.
- **Verify**: `pnpm verify` for the static gate; drive a running app with `agent-browser` for runtime checks. `apps/kyh` is the safest browser surface (no DB, no auth, no required keys); `apps/cli` gets `typecheck` + `build` only.
- **`pnpm lint` is a clean gate.** `oxlint.config.ts` extends the ultracite presets (core, react, next, anti-slop); every rule is an error. Fix the code, don't add config overrides; a `// oxlint-disable-next-line rule -- why` needs a stated reason.
- **policingice's database is remote production.** No local DB, no seed, no test login. Never run its `db:push`/`db:studio` or anything in `apps/policingice/scripts/`.

## Apps

### kwadrants (`apps/kwadrants`)

2x2 matrix canvas editor using react-konva.

**Stack**: React, Vite, Konva, Tailwind v4, motion

**Features**:

- Draggable tags + images on canvas
- Editable axis labels (click to edit)
- Quadrant color customization
- Grid options (none/squares/dots)
- Layout modes: axis (labels at axis ends) vs edge (labels as headers)
- Floating draggable panel snaps to 4 corners
- Export to PNG/JPEG
- State persisted to localStorage

**Key files**:

- `src/lib/kwadrant-context.tsx` - state management
- `src/components/canvas/` - Konva canvas components
- `src/components/ui/floating-island.tsx` - draggable toolbar

### cli (`apps/cli`)

Personal CLI tool.

### autoplay (`apps/autoplay`)

Your feeds as live TV channels of AI-generated video. CH 01 is the owner's X
(`OWNER_X_USERNAME`): live while the owner watches — and recorded to Vercel
Blob as it plays — which everyone else follows ~20s behind, or replays later.
Sign-up is invite-only: codes are `invite_code` rows, minted with `pnpm -F @repo/autoplay invite`.
Signing in with X gives a lineup of your own channels, one per connected
source: your X (unless you are the owner), Gmail newsletters, a feed URL,
YouTube subscriptions. A channel is a MiniMax H3 Max Director session
(`minimax/h3-max/director`) opened in the viewer's browser over WebRTC via
`/api/fal/proxy`, opened on one of the formats in `src/lib/prompt.ts` (sitcom, satirical news, pirate TV, anime news); the programming sends the next item ten seconds after the previous one reaches the screen.
Rules: best first (each kind's adapter ranks: X by engagement via personalized
trends then the home timeline above `MIN_SCORE`; mail and feeds by recency;
YouTube by views), never twice (`aired_item`), budgeted ($20 a day a viewer,
$50 the station, priced from `live_session` — the sessions and heartbeats the
proxy relays — and checked before a session is negotiated; X reads priced
into `source_read`, $10 a day the station, served between buys from
`source_cache`, which every instance shares).

**Stack**: Next.js, Tailwind v4, zod, Drizzle + Turso, better-auth (X social
provider for sign-in, Google linked for grants), Base UI dialogs,
`@fal-ai/client` realtime + `@fal-ai/server-proxy` — the policingice stack, on
autoplay's own database (its `db:push` is safe, unlike policingice's; sign-in
needs the DB, aired items fall back in-memory). Port 3005.

**Key files**:

- `src/lib/lineup.ts` - a viewer's channels: the public owner channel + their `source` rows; auto-creates sources from grants; resolves live vs replay
- `src/lib/live.ts` - programming: next item via the adapter, never-twice, daily budgets
- `src/lib/reads.ts` - the read cache every instance shares, and the ledger of paid X reads the read budget is counted from
- `src/lib/sources/` - one adapter per kind (`x`, `gmail`, `rss`, `youtube`); `types.ts` is the Item contract
- `src/components/live-screen.tsx` - the director session: opens via the proxy, paces prompts off the picture, closes when idle, records CH 01
- `src/lib/recorder.ts` / `src/lib/recordings.ts` / `src/components/replay-screen.tsx` - one webm per program to Blob; the replay loops the newest
- `src/app/api/fal/proxy/route.ts` - gated fal proxy (signed-in, within budget, director endpoint only); records the sessions and heartbeats it relays as the meter
- `src/db/drizzle-schema.ts` - better-auth tables + `invite_code` + `source` + `aired_item` + `live_session` + `recording` + `recording_file` + `source_cache` + `source_read`
- `src/lib/auth.ts` - better-auth config (X sign-in, Google as a linkable grant with per-source scopes)
- `src/lib/x-account.ts` / `src/lib/grants.ts` - read/refresh the X and Google grants
- `src/components/tv.tsx` - the TV chrome: ch−/ch+, static, status bar, sources dialog
- `.env.example` - every key documented; app boots without them and shows OFF AIR

### bay (`apps/bay`)

San Francisco as one isometric map, after tinygyn.com. Vite SPA (vanilla TS, canvas), port 3017,
plus a pipeline run by hand (README), keyless: `render` builds each tile's scene from open data
(DataSF buildings and street trees, OpenFreeMap vector tiles, AWS terrain; cached in
`data/source/`) and draws it with three.js in headless Chrome (`render.html`); `pyramid` cuts
the renders into `public/data/`. `paint` is optional: an OpenAI image model repaints the renders,
carrying on from painted neighbours (dry run without `--go`: it costs money); `jobs` hands the same
frames to a local agent instead, in waves of folders under `data/jobs/` (`CODEX.md` is its
brief); and
`pyramid --from=paint` cuts that instead. Data is gitignored; the viewer shows "Nothing drawn
yet" without it.

**Key files**: `src/lib/grid.ts` (the one projection: local metres ↔ canvas, each tile's camera),
`src/lib/scene.ts` (the scene and its pure helpers; tested), `pipeline/source.ts` (the open data,
a frame's scene), `src/render/` (the three.js drawing; `style.ts` is every colour),
`src/lib/paint.ts` (paint order, context + mask, feathered blend; tested), `src/lib/pyramid.ts` /
`src/lib/view.ts` (levels, pan/zoom; tested), `pipeline/prompt.ts` (the painter's brief), `pipeline/jobs.ts` + `CODEX.md` (painting with an agent),
`src/main.ts` (viewer).

### kyh (`apps/kyh`)

Main website. Also the agent-facing surface: `src/lib/` holds the pure builders
behind `/markdown`, `/llms.txt`, the JSON-LD graph and the 404 body, each with
unit tests next to it. `src/lib/config.ts` is the single source of truth for the
canonical routes — add a page there and it appears in the sitemap, `llms.txt`,
the homepage site nav and the 404 recovery links at once.

The site has one set of themes: plain Light and Dark, and one per holiday,
which brings its own light or dark (Halloween, Christmas and Lunar New Year are
dark). `src/themes/store.ts` owns it (no next-themes): the calendar's theme
for today unless the menu picked another (gone on reload), else the
visitor's own light or dark, kept in localStorage (`theme`) or their
system's; a tap back to the system's own light or dark forgets the pick, so it
follows the system again (next-themes' "system"). `useTheme` reads the theme's
id, `useAppearance` the theme with its light or dark and the visitor's own. It
paints `data-theme` (light or dark: what global.css and Tailwind's `dark:`
read), `color-scheme` and the theme's tint on `<html>`, and the mobile
browser's bar (`<meta name="theme-color">`) in the page's own background,
`--bg-highlighted`, tinted as the theme tints it (`paint.ts`; a test holds
`barColor` to global.css), once
it's first subscribed to and on every change that shows, with transitions held
still for the repaint so nothing fades in at its own pace (the toggle's sun and
moon turn by motion, not CSS). While subscribed it follows the system's light
or dark, a pick in another tab (`storage`), and the calendar into a new day
when the tab is next looked at (`visibilitychange`); a theme picked in the
menu stays in its tab. The
dock's theme toggle wears the theme's icon: a tap flips light and dark, or
takes a holiday's theme back to the visitor's own; held down (or ArrowUp), it
blooms the themes as a radial menu over itself (`src/components/theme-bloom.tsx`):
a solid disc that springs from the button (nudged up off the bottom), a wedge
per theme (plain light or dark is one, wearing the sun or moon it goes back
to: the visitor's own) clipped to its slice so the slice takes the pointer, unfolding one
after another round a hub that wears the one under the pointer (names go to
assistive tech and typeahead only, not on screen). The disc covers the
toggle, so the toggle can't be pressed while it's open. The dock settles back
to rest as it opens and stops magnifying while it's open. It's Base UI's Menu
(radio items, focus, arrow keys and typing a name, dismissal; the hub closes
it); picking a theme closes it. A hold's release is no tap: the dock keeps
whether the press was a hold until the next one, and a finger's lift sends no
click (its `touchend` is cancelled). `ThemeIcon` (`theme-icon.tsx`) draws a
theme: the toggle and the hub wear its `glyph` (a line icon drawn to the
dock's 2px stroke, `iconAttrs`), the wedges its colored piece, and the default
theme (named "Light / Dark", no glyph) the sun or moon.

Themes live in `src/themes/`, one folder each (`christmas/`, `halloween/`,
…). A folder's `index.ts` exports its `theme`, every effect the whole site
reads (`Theme` in `theme.ts`; registry `THEMES` in `index.ts`, in calendar
order); its `town.ts` exports its `town`, how the showcase's town dresses
(`Town` in `city/town-theme.ts`; registry `TOWNS` in `towns.ts`, keyed by
theme so a new one won't compile without it). The town is kept apart so its
drawing code loads only on `/showcase` (Turbopack keeps a module's imports
whole, so a `town` beside `theme` would ship it on every page). Adding a theme
is adding its folder and a line in each registry. Adding an effect is a field
on `Theme` (or `Town`), a value in each theme, and a read where the effect
shows (`themeOf(id).<field>`, `TOWNS[id].<field>`). The fields:

- `days`: when it runs (`calendar.ts`: fixed dates, Easter's computus, the 4th
  Thursday, a Lunar New Year table); the default theme has none;
- `mode` and `tint`: its light or dark, and its grey tint (an OKLCH hue and a
  chroma as a multiple of slate's), painted by `paint.ts`;
- `art`: its piece as data (`art.ts`: paths and gradients, drawn by
  `piece.tsx`; a layer can `swing` about a point, as the bat's wings beat),
  thrown by easter-egg finds, worn by the menu's wedges and falling in the
  drift; `glyph`, its line icon; `confetti`, the finds' colors;
- `drift`: what falls across every page (`drift.tsx`, CSS-animated): snow at
  Christmas, leaves at Thanksgiving, nothing in the rest;
- `town.ts` (`Town`), how the showcase's town dresses:
  - `repaint`: tokens in its own colors, which stay in color in the grey town,
    and `vivid`, tokens kept in their own: snow on the roofs, grounds and trees
    at Christmas (`snowfall` in `palette.ts`), the trees turned at
    Thanksgiving, windows lit orange at Halloween, pastel roofs at Easter;
  - props on five kinds of open spot (`city/open-spots.ts`, worked out from the
    layout `houseCells`, `parkOf` and `plazaOf` in `draw-blocks.ts` draw):
    porches, gardens, the pond's shore, the square and the ball courts, drawn
    by `decor-props.ts` (pumpkins by the doors and graves in the gardens at
    Halloween, snowmen and decorated trees at Christmas, and so on), and the
    square's fountain (`BASIN`) for one giant piece (`decor-giants.ts`): the
    town's tree at Christmas, a waving skeleton at Halloween, a painted egg at
    Easter, a heart at Valentine's, a lantern gate at Lunar New Year, a
    shamrock at St. Patrick's, a turkey at Thanksgiving;
  - `lights`, strung round every cottage's eaves and along the blimp's back;
  - `emote`: what the town's people now and then send up (hearts at
    Valentine's), floated over their heads by `life.ts` (`Emote` in `overlay.ts`);
  - its sky: the blimp's `blimp` look, its greeting in the theme's colors
    ("BOO!" at Halloween) and a hat or trim (`blimp.ts`; the hats in `hats.ts`,
    which Santa and the witch wear too), and a `flyer` crossing higher up the
    other way (Santa's sleigh, a witch on her broom; `sky.ts`). A day without a
    holiday flies the site's name in grey. The blimp and the flyer turn with the
    camera (each view draws them a quarter turn on, and they swing with it
    mid-turn), so they always cross the screen and the banner always faces it.

Each view of the town is dressed for the theme by its decorations
(`decor-scene.ts`, a drawing of their own, drawn a few spots at a time) and its
sky (`sky-scene.ts`), in color over the grey town, and redressed without
redrawing the town when the theme changes: at once for the view on screen,
and a few milliseconds a frame for the others kept (`draftAhead` in
`engine.ts`). The engine takes a `Setting` (day or night and the theme's id)
and paints from a `Scheme` (the theme and its town; `schemeOf` in
`town-theme.ts`).
The giant pieces, blimp trims and flyers draw through
`placed` (`sketch.ts`): one pen that moves every point into a frame, turned
onto a heading (`headedTo`, `FLANK_ON`), scaled or stood somewhere.
The calendar picks today's theme (first listed
wins an overlap); the themes menu overrides it for the page load (`store.ts`).
The tint is `data-tint`, `--tint-hue` and `--tint-chroma` on `<html>`
(`paint.ts`), where `global.css` retints Tailwind's slate in oklch; Classic has
no tint and keeps the hex slate. `script.ts` (put in `<head>` by
`theme-script.tsx`) paints the theme and the bar (making its meta) before
first paint, the calendar's theme
with its light or dark else the visitor's (its windows worked out ahead for
2026–2036; a test holds it to the store's painting day by day). No theme's
days run past December 31st: the calendar looks only in the day's own year (a
test holds every theme to it).

`/showcase` is a city of the projects: an isometric island drawn the way
[Inkline Town](https://github.com/SandroMaglione/inkline-town) draws its town
(flat unlit faces, ink outlines, a fixed 30° camera), in three.js, all in greys.
Every project in `src/lib/data.ts` gets a building — a bespoke one when its slug
is in `draw-landmarks.ts`, otherwise a generic one with its name on it on the
nearest free lot — with its favicon floating over the roof as a real link
(`city-pins.tsx`). Hovering a building or its icon paints that building in its
colors, turned in OKLab onto its project's own (`colors` in `data.ts`, picked
from its icon, main first; each family of hues in the building takes the next
one, `lookOf` in `palette.ts`), rings its lot in a soft band of its own color (`halo.ts`) and opens its
icon into a card with its URL and description (a motion `layout` morph);
clicking opens the project in a new tab (touch: the first tap on the building
or icon opens the card, a second tap or a tap on the card opens the project). A trackpad's
two-finger scroll pans the town, as a drag does on touch; pinch zooms; `[` and `]`
(or the turn button in the top-left corner, `turn` on the engine) turn the
camera a quarter turn, swinging round over half a second. Each of the
four views is its own sketch, and so is each turn between two (every face either
end sees); the ones a turn away are drawn ahead in the background: walls carry windows on both opposite
faces, while doors, signs and storefronts stay where they are in the world. On arrival the camera starts close on downtown and pulls back to most of the
island while the town is built, as in a sim game: `schedule.ts` gives every lot and block a start, from downtown
out; each building goes up a storey at a time from a slab (a vertex-shader
rise every town material in `render.ts` shares, its start carried per vertex);
each project's site is fenced with materials stacked, tower cranes go up
beside the tall ones a section at a time (jibs on their building) and come down
after, the building rises inside scaffolding drawn with the town's own
materials, and a few dump trucks and mixers (one to three a site, seeded) come and go by
road at a steady pace, parking nose to tail, each planned so it never meets
another (a truck with no clear way stays away) (`crews.ts` plans it, pure; `draw-crews.ts`; `sites.ts` puts it on screen);
pins, cars and people wait for the buildings (the town's own traffic pops in
once it's open), and then the title-sequence flyover zooms in while the last
trucks drive off. Only moving the camera stops the flyover, the
corner's play button pauses it, and it resumes after 30s idle. Typing anywhere chats
(arrows pan; letters are chat's, so there's no WASD): the draft shows beside the
typer's pointer and Enter sends a line that stays up 6s. `src/lib/chat.ts` holds
the rules for the town and the site-wide cursors alike: each visitor's draft and
last line ride in their player state, so nothing accumulates. Dark mode is night. A `Scheme` (`palette.ts`) is day or night and the theme: each color is its town's repaint of its token or its own (`colorIn`), and the greys are plain by day, slate by night, turned to the theme's hue when it has one (`greyIn`), worked out once per time, theme and token. The showcase hears the theme by subscription, not a render, and the engine repaints the drawing on screen at most once a frame. Code in `src/app/showcase/_components/city/`:
`plan.ts` (island, roads, which lot each project gets; pure, tested),
`sketch.ts` (faces, silhouettes and ink worked out per view; shading follows the camera),
`render.ts` (sketch → three.js; each building repaints itself grey or colored; faces in `SHADE` carry a fine dither of ink dots, `shadow-dots.ts`),
`landmarks-*.ts` (the buildings), `controls.ts` (which building is lit, when
the flyover runs, tap vs drag vs pinch, the keys; pure, tested), `engine.ts`
(camera, tour, pins, input, loop). In dev, `window.city.look(x, z, zoom)` moves the camera and
`window.city.debug()` reports the town; headless Chromium needs
`--use-angle=swiftshader,--enable-unsafe-swiftshader` for WebGL.

The ground is alive and shared. `world.ts` steps the cars, passers-by
(`traffic.ts`) and visitors (`visitors.ts`: out of one project's door with a
line from `quotes.ts`, along the sidewalks, into another) in fixed 20Hz ticks,
each mover with its own random state, so every browser stepping the same
snapshot gets the same town; pure and tested. `life.ts` draws it between
ticks, floats the visitors' lines and other people's pointers (`overlay.ts`),
and lets anyone pick up a car or a person and drop it on the nearest road or
sidewalk. The sailboats and the ferry lift too (`boats.ts`), but only on this page: they sail
on its own clock, and one dropped on land goes back to its course. `net.ts` shares it in a room on the vibedgames party server
(`src/lib/party.ts`): the host puts up a snapshot every 8s for joiners, a
pick-up is a claim, a drop carries the mover's exact landed state, pointers go
out at 15Hz, and everything off the wire is validated. With no server the town
plays alone. Rooms are named by `TOWN_VERSION` and the project slugs: bump
`TOWN_VERSION` whenever stepping or packing changes, or old and new pages
desync in one room.

The rest of the site shares one room, `kyh-site`, on the same server:
`src/lib/site-room.ts` is the store (one client, no React; host-side features
are a fixed slice table, since the host may be on any page), and
`components/multiplayer/provider.tsx` opens it in `Providers` and exposes hooks
(`usePlayers`, `useSelf`, `useChat`, `useRoomClock`, `useSharedOrder`), each
subscribing to just what it reads. `components/multiplayer/cursors.tsx` draws
everyone's pointers and chat, and skips `/showcase`, which draws its own.
Where this visitor's own pointer is lives in `src/lib/pointer.ts` (one set of
window listeners for the page): the cursor sent to the room, their chat draft
and the easter eggs' bursts all read it.

The homepage's side-quests grid and its folders are iOS home screens
(`src/components/sortable-grid.tsx`, generic over items): long-press an icon and
the grid wiggles, drag to reorder (motion's `Reorder` in `xy`), press elsewhere
or Escape to stop. The grid owns the gesture and calls `onDrop` once on release.
The order is shared in `kyh-site` while the room lives (`useSharedOrder`;
`shared-order.ts` is the pure, tested part): a drop shows at once and sends the
host a `reorder` intent, the host writes `orders` into shared state, and
everyone reads it against their own tiles. A held tile ignores the room until
it's dropped. `side-quests-grid.tsx` is the one place grids meet the room;
`ProjectAppGroup` just takes ordered items and `onDrop`.

Easter eggs live in `src/easter-eggs/`. `store.ts` lists them and keeps which
are found (memory only: a refresh starts over); a find is one
`discoverEgg(id)` where it hides: `city/engine.ts` (lift a car, person or boat),
`lib/chat-input.ts` (send a chat line), `figure-canvas.tsx` (spawn shapes),
`dock.tsx` (hold the theme toggle), `side-quests-grid.tsx` (move an
icon), `rsvp-reader.tsx` (open the speed reader). A touch-only device (no
hover, coarse pointer) hunts without the chat egg, since it has no keyboard
(`huntedEggs`).
`provider.tsx` celebrates each like a coin pickup: a label at the pointer,
shaded golden eggs spraying out and flying to the avatar's `EggCatcher`, which
pops as each lands (what flies is the theme's piece: bats over Halloween,
snowflakes at Christmas, in the theme's confetti), and a fountain of confetti: paper that flutters and flips
between its two sides, and sequins that drop, on one canvas that comes and goes
with it (`confetti.ts`; the throw and the physics are `burst.ts`, pure, tested). Once the last egg of the last
find lands the visitor's own color becomes `gold` (`setOwnColorName` in
`lib/color.ts`), so their avatar, pointer, cursor, chat and town pointer go
gold everywhere through the `look` they already share.

### policingice (`apps/policingice`)

Crowdsourced ICE incident documentation. Next.js, Drizzle + Turso, better-auth.

### stonksville (`apps/stonksville`)

Realtime trading chart game. Next.js, canvas-based candlestick rendering. Replays real S&P 500 daily history, one trading day per 5s grid cell. The CSV lives in Vercel Blob, served by `/api/spx` (seeds itself from Yahoo Finance on first request, reads Yahoo directly without a store) and refreshed by a weekday Vercel Cron hitting `/api/cron/spx`. `src/lib/spx-source.ts` fetches and stores it; `src/lib/price-engine.ts` synthesizes the intraday ticks; `src/lib/game-state.ts` keeps the grid in log-price rows.

### commuting-clawders (`apps/commuting-clawders`)

The folder is the leaderboard site; `mod/` inside it is the Claude Code mod
(see Claude Code mods below), and the paths below are the mod's. The mod opens the **Commuting Clawders**
pane, a self-playing endless runner starring Clawd that runs while Claude
works, and posts each run to a shared leaderboard. No slash
commands: the pane opens on session start.

- Picture: `world/` is a three.js game (procedural only, no model files)
  rendered in the installed Chrome, headless, by `stream/stream.ts`, which
  the pane spawns with `$.process.spawn` while it is drawn. Chrome is spawned
  directly (`stream/chrome.ts`, no driver) on a throwaway profile, with
  `--remote-debugging-pipe` so it dies with the streamer even on SIGKILL. The page posts each frame's RGBA; the
  hooks poll `GET /frame` over a Unix socket (numbers in `x-` headers, cells
  in the body: hooks can't import zod). kitty/Ghostty get an `Image` reading
  an RGBA file; elsewhere quadrant `Raster` cells, and the world switches to
  its coarse look (flat surfaces, nearer fog, bigger Clawd, no HUD). The
  Chrome → Node copy of each frame bounds the frame rate, so frames are
  sized to what the terminal shows (`frameSize`), and the page keeps one in
  flight.

- Ships built: `pnpm build` writes `dist/` (the world via `vite build`, the
  streamer bundled to `dist/stream.mjs`, run with `node`), and `dist/` is
  committed. An installed plugin gets no `node_modules` (Claude Code skips
  pnpm lockfiles and `workspace:` deps), so the mod has no runtime
  dependencies. Rebuild and commit after changing `world/` or `stream/`.
  Users install from `.claude-plugin/marketplace.json` at the repo root
  (marketplace `kyh`).
- Runs (`hooks/run.ts`): `turn.start` starts or carries one, every
  `turn.step`'s `output_tokens` (subagents' included) is its score, and the
  main loop's `turn.complete` starts a 5s grace. A prompt within it carries
  the run on; past it the run is over, the world freezes, and the next run
  starts a fresh game. The hooks send `active` and `tokens` down with each
  poll; the HUD pill shows the tokens.
- Leaderboard: the site, `apps/commuting-clawders` itself
  (`@repo/commuting-clawders`), a Next.js app on Vercel at
  `clawders.kyh.io` with its own Turso database (Drizzle; `db:push` is local,
  `db:push-remote` production). It takes `POST /runs` and lists each
  player's best inside a live demo (the pane's `[Leaderboard]` prints it
  in the terminal): a scripted Claude Code session
  (`src/lib/demo.ts`, a pure function of time) driving the real game, which
  the site imports from the mod (`@repo/commuting-clawders-mod/world` → `world/mount.ts`;
  `world/view.ts` is the drawing both it and the streamed page share) along
  with `hooks/run.ts` for the status line. The hooks post to `leaderboardUrl` under `playerName`
  (else git's `user.name`); `leaderboard: false` stops posting. Anyone can
  post, so the zod schema bounds every number.
- Release: installs update only when `.claude-plugin/plugin.json`'s
  `version` changes; bump it to ship. CI rebuilds `dist/` and fails on a
  diff. The idle status line always says where runs post (`posting as …`),
  since the name defaults to git's `user.name`. `POST /runs` refuses more
  than 500 tokens a second of run (plus a 4,000 head start) and more than 20
  posts per IP (hashed with the day) in 10 minutes. Windows is refused in the
  pane: the streamer needs a Unix socket.

**Key files**: `hooks/register.tsx` (hooks, runs, streamer, blits),
`hooks/run.ts` (run state, grace, status line), `hooks/screen.ts` (socket,
frame parsing), `hooks/game.ts` (runner simulation + autopilot, shared with the
world), the site's `src/` (route, zod run schema, standings query, page),
`world/` (three.js scene; `vfx.ts` particles off game-state changes),
`stream/` (Chrome launch, world files, frame → RGBA or cells), `types/index.d.ts` (the `$.state` contract).

### mod-dev (`apps/mod-dev`)

Claude Code mod (see Claude Code mods below). Holds Claude to one rule:
never say a change is done before it's proven: verified after the last edit,
run end to end where it runs, idiomatic to this codebase and its libraries'
installed docs. `/score` shows the scorecard on demand.

- Evidence is mechanical: the session's tool calls (subagents' included) make a
  ledger of edits and checks. Bash commands are classified by what they run
  (`pnpm test`, `tsc`, `agent-browser`, `sed -i`, heredoc and inline-script
  writes); a check counts only if it passed after the last edit.
- Needs come from the nearest `package.json` of each edited file: `static`
  where it has a typecheck or lint script, `test` where it has `test`, `e2e`
  for a source file of a package that runs (`dev`, `start`, `session`,
  `preview`). Docs need nothing. A check aimed at packages (`-F name`,
  `workspace name`, `cd dir`) counts for those it names, and one aimed at
  none for all; each kind shows its worst package. A check Claude can't run is waived
  by a reply line `Unverified: <check> — <why>`; the reviewer judges the reason.
- The gate (`classic.Stop`): Claude stopping with edits is sent back while a
  needed check is missing, then while the reviewer finds it not ready, at most
  3 times per prompt. A question to the person passes. The ship gate
  (`classic.PreToolUse`) refuses `git push`, `gh pr create` and the GitHub
  MCP's PR tool until the reviewer finds the change ready (a failed review holds
  them too). `gate: false` turns
  both off. The bar is told to Claude once, at `classic.SessionStart`.
- The reviewer is `$.model.complete` with a fresh context, never the session's
  reasoning, in two parts (`hooks/review.ts`, effects passed in as ports): a
  looker on `lookModel` (sonnet) answers with `read:`, `grep:` and `list:`
  lines (up to 8, 3 rounds) that the mod runs read-only inside the repo, then
  the judge on `model` (opus) scores in one call. An e2e step counts only if it
  reached the changed code. Every fix
  must cite a source (`path:line`, an instruction file, a doc under
  `node_modules`, a URL, or `ledger`); uncited fixes are dropped. A ready
  change is reviewed once per diff and checks; a not-ready one again once
  Claude answers it.
- Risk sets the bar for confidence (low 7, medium 8, high 9); the other scores
  need 7; any score of 4 or less is not ready. `claude -p --resume <id> "/score"`
  exits 0 only when ready.
- Shows: a band above the prompt (each needed check, the verdict and scores,
  `[Details]`), a pane (`mod-dev`: scores as bars, the checks with their
  commands, fixes with sources) and the status line.

**Key files**: `hooks/register.tsx` (hooks: the gates, `/score`, band and pane
layout), `hooks/proof.ts` (needs per package, which checks count for which,
waivers, what the gate tells Claude), `hooks/review.ts` (the looker and the
judge), `hooks/look.ts` (the looker's reads), `hooks/board.ts` (signs, colors,
score rows, the status line), `hooks/grade.ts` (the rubric, the
prompt, parsing the answer and its sources, the verdict, the scorecard),
`hooks/evidence.ts` (the ledger, freshness), `hooks/commands.ts` (what each
command means), `hooks/shell.ts` (command lines into words), `hooks/git.ts`
(the diff script, fingerprints), `types/index.d.ts` (the `$.state` contract).

### Claude Code mods (`apps/commuting-clawders/mod`, `apps/mod-dev`)

Plugins of function hooks, not web apps. Both share one layout; keep it that
way when adding a mod.

- `.claude-plugin/plugin.json` (manifest, `userConfig`), `hooks/hooks.json`
  naming one module, `hooks/register.ts(x)` holding only the hooks: the glue
  between `$` and pure modules beside it (`hooks/*.ts`) that import nothing
  from `claude-code`. A mod that keeps `$.state` declares it in
  `types/index.d.ts`, named by the manifest's `types`.
- Load: `pnpm dev:<mod>` (`claude --plugin-dir apps/<mod>`), or
  `CLAUDE_CODE_PLUGIN_DIRS` in `~/.claude/settings.json` for every session and
  the desktop app. An interactive session hot-reloads the folder on save.
- Tests split by suffix. `test/*.spec.ts`: the pure modules under node
  (`pnpm test`, CI). `test/*.test.ts`: the hooks under `claude plugin test`
  with the engine mocked beneath (`test:mod`, local; needs `claude`). The kit
  loads every `*.test.ts`, so node tests can't share the suffix.
- `pnpm typecheck` runs two configs: `tsconfig.json` (pure modules + specs,
  node types) and `tsconfig.plugin.json` (hooks + `*.test.ts`, extending
  `@repo/claude-code-types/tsconfig.json`). `validate` is
  `claude plugin validate .`.
- `packages/claude-code-types/claude-code.d.ts` is the plugin API pinned from
  the Claude Code version on its first line, shared by every mod; lint and
  format skip it. Refresh after an update from the copy the engine lays in a
  loaded mod's gitignored `.claude-plugin/types/claude-code/index.d.ts`.

### tc, covid-19, vis-ml

Other project apps.

## Packages

Shared configs and utilities in `packages/`. `claude-code-types` is the
mods' pinned plugin API and hooks tsconfig (see Claude Code mods).
