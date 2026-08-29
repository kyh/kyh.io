# feedreel

An X feed as a TV channel of AI-generated video.

Visit the site and CH 01 is already playing: the owner's feed, rendered as
short clips by fal.ai
([`minimax/h3-max/text-to-video`](https://fal.ai/models/minimax/h3-max/text-to-video)
by default — ~3s to generate a 5s 768p clip, faster than you can watch it).
Sign in with X and CH 02 becomes your own feed. The UI is a television:
full-bleed video, static between programs, an on-screen display that fades
away.

## Programming rules (src/lib/channel.ts)

1. **Lazy** — a new clip is generated only while someone whose feed it is
   watches: the owner on CH 01, you on CH 02. Anonymous visitors and idle
   hours replay the archive (RERUN) instead of spending money.
2. **Popular first** — the highest-engagement un-aired post goes next
   (retweets/quotes ×3, replies ×2, likes ×1, minimum score to qualify).
   When nothing in the current batch clears the bar, older pages of the feed
   are fetched before settling.
3. **Never twice** — every clip is archived by post id (KV) and rerun
   forever; a post is paid for at most once. Daily caps and generation
   spacing back this up.

## Setup

```sh
cp .env.example .env   # then fill in the keys — each is documented inline
pnpm dev:feedreel      # → http://localhost:3005
```

1. **X OAuth app** — [developer.x.com](https://developer.x.com/en/portal/dashboard),
   callback `http://localhost:3005/api/auth/callback`.
2. **`OWNER_X_USERNAME`** — the handle whose feed is CH 01.
3. **fal key** — [fal.ai/dashboard/keys](https://fal.ai/dashboard/keys); billed per video.
4. **KV** — any Upstash-compatible Redis REST endpoint (Vercel's Upstash
   integration sets the env automatically). Skippable in local dev: the
   archive then lives in server memory only.
5. **Session secret** — `openssl rand -base64 32`.

The app boots with none of these and shows an OFF AIR screen listing what's missing.

## How it works

- **Auth**: OAuth 2.0 Authorization Code + PKCE against X. No user database —
  tokens are sealed into an httpOnly AES-256-GCM cookie (`src/lib/session.ts`)
  and refreshed transparently.
- **Channel** (`POST /api/channel`): decides the next program. Fresh clip if
  the viewer may generate (their own feed) and a post qualifies; otherwise a
  rerun from the archive; otherwise OFF AIR. Slow-model generations are
  parked as pending jobs and finished on a later request rather than wasted.
- **Archive** (`src/lib/store.ts`): Upstash-compatible Redis REST, degrading
  to in-memory maps when unconfigured.
- **TV** (`src/components/tv.tsx`): one clip playing, one buffered ahead,
  requested only while the tab is visible — the client's laziness is what
  makes the whole pipeline lazy.
