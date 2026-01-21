# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
pnpm dev          # Dev server on port 3000
pnpm build        # Production build
pnpm test         # Run tests (vitest)
pnpm check        # Format + lint fix
pnpm db:push      # Push schema to Turso
pnpm db:reset     # Clear content tables (incidents, videos, votes)
pnpm db:studio    # Open Drizzle Studio
```

Create admin user:

```bash
npx tsx scripts/create-admin.ts <email> <password> [name]
```

## Architecture

**TanStack Start + Nitro full-stack app** - uses file-based routing with SSR capabilities.

### Key Layers

- **Routes** (`src/routes/`): File-based routing via TanStack Router. Server functions defined with `createServerFn()`.
- **Database** (`src/db/`): Drizzle ORM + Turso (SQLite). Schema in `schema.ts`, client in `index.ts`.
- **Auth** (`src/lib/auth.ts`): better-auth with anonymous + email/password. Client in `auth-client.ts`.

### Data Flow Pattern

Routes use `createServerFn()` for server-side data fetching. These run on server during SSR and client-side after hydration:

```tsx
const getData = createServerFn({ method: 'GET' })
  .inputValidator((data) => data)
  .handler(async ({ data }) => {
    /* db queries */
  })

export const Route = createFileRoute('/path')({
  loader: () => getData({ data: {} }),
  component: Component,
})
```

### Route Structure

- `/` - Public incident feed with infinite scroll + voting
- `/incident/$id` - Single incident view
- `/admin/*` - Protected admin routes (requires non-anonymous user)
- `/api/auth/$` - better-auth API handler

### Schema

Core tables: `incidents` (with videos relation), `videos`, `votes`. Auth tables: `user`, `session`, `account`, `verification`.

### Path Aliases

`@/*` maps to `./src/*`

## Environment Variables

Required in `.env.local`:

- `TURSO_DATABASE_URL`
- `TURSO_AUTH_TOKEN`
