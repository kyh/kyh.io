# Party

Real-time multiplayer server powering kyh.io interactions.

## Stack

- Runtime - [Cloudflare Workers](https://workers.cloudflare.com/)
- WebSockets - [PartyServer](https://github.com/cloudflare/partykit/tree/main/packages/partyserver) (Durable Objects)

## Development

```bash
pnpm install
pnpm dev:party
```

## Deployment

```bash
pnpm deploy:party
```
