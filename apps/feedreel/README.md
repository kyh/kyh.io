# feedreel

Your X feed as an endless AI-generated video reel.

Log in with X, pull your latest home timeline, and watch it as a full-screen
vertical reel: each post is turned into a short video by fal.ai
([`minimax/h3-max/text-to-video`](https://fal.ai/models/minimax/h3-max/text-to-video)
by default). Posts are generated **one at a time, in feed order**, and since
generation (~3s) is faster than watching (5s clips), the pipeline stays ahead
of playback — the reel never runs dry until the feed does.

## Setup

```sh
cp .env.example .env   # then fill in the keys — each is documented inline
pnpm dev:feedreel      # → http://localhost:3005
```

1. **X OAuth app** — create one at [developer.x.com](https://developer.x.com/en/portal/dashboard),
   enable user authentication (Web App, callback `http://localhost:3005/api/auth/callback`),
   copy the OAuth 2.0 Client ID + Secret.
2. **fal key** — [fal.ai/dashboard/keys](https://fal.ai/dashboard/keys). Generation is billed per video.
3. **Session secret** — `openssl rand -base64 32`.

The app boots without any of these and shows a setup checklist for whatever is missing.

## How it works

- **Auth**: OAuth 2.0 Authorization Code + PKCE against X. Tokens are sealed
  into an httpOnly AES-256-GCM cookie (`src/lib/session.ts`) — no database.
  Access tokens are refreshed transparently via `offline.access`.
- **Feed**: `GET /api/feed` reads the reverse-chronological home timeline.
  If the API tier doesn't allow it (403 on free tier), it falls back to your
  own posts and tells the UI which source it used. Retweets are resolved to
  the referenced post's full text so prompts aren't truncated `RT @…` stubs.
- **Video**: `POST /api/generate` submits a prompt to fal's queue and polls
  server-side (~3s for the default model); slow models fall back to client
  polling via `GET /api/generate?requestId=…`.
- **Reel** (`src/components/reel.tsx`): vertical snap-scroll player. A single
  runner generates the next post's video whenever the buffer is less than two
  clips ahead of what you're watching, strictly one generation in flight.
