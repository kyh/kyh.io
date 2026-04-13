# kyh.io

Personal monorepo. Uses pnpm workspaces + Turborepo.

[kyh.io](https://kyh.io)

## Apps

| App | Description | Stack |
| --- | --- | --- |
| [kyh](apps/kyh) | Personal website | Next.js, Matter.js |
| [kwadrants](apps/kwadrants) | 2x2 matrix canvas editor | React, Konva, Vite |
| [policingice](apps/policingice) | Crowdsourced ICE incident documentation | Next.js, Drizzle, Turso |
| [stonksville](apps/stonksville) | Trading chart game | Next.js, Canvas |
| [tc](apps/tc) | Total compensation calculator | React, Visx, Vite |
| [covid-19](apps/covid-19) | COVID-19 tracking dashboard | React, D3, Vite |
| [vis-ml](apps/vis-ml) | Interactive ML visualizations | D3, Scrollama, Vite |
| [cli](apps/cli) | Personal CLI tool | React, OpenTUI, Bun |
| [party](apps/party) | Real-time multiplayer server | PartyServer, Cloudflare Workers |

## Packages

| Package | Description |
| --- | --- |
| [typescript](packages/typescript) | Shared TypeScript config |
| [eslint](packages/eslint) | Shared ESLint config |
| [prettier](packages/prettier) | Shared Prettier config |

## Development

```bash
pnpm i            # install dependencies
pnpm dev-<app>    # dev server for specific app (e.g. pnpm dev-kyh)
pnpm build        # build all
pnpm lint         # lint all
pnpm typecheck    # typecheck all
```

## Deployment

Apps auto-deploy via Vercel/Cloudflare Pages on push to `main`.
