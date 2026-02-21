# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
pnpm dev          # Dev server on port 3000 (Next.js with Turbopack)
pnpm build        # Production build
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

**Next.js App Router** - uses React Server Components and Server Actions.

### Key Layers

- **App Router** (`src/app/`): Next.js file-based routing with RSC pages and Server Actions.
- **Server Actions** (`src/actions/`): `incidents.ts` for public actions, `admin.ts` for admin actions. All marked with `"use server"`.
- **Database** (`src/db/`): Drizzle ORM + Turso (SQLite). Schema in `schema.ts`, client in `index.ts`.
- **Auth** (`src/lib/auth.ts`): better-auth with anonymous + email/password + `nextCookies` plugin. Client in `auth-client.ts`.
- **Components** (`src/components/`): Shared UI components, all client components with `"use client"`.

### Data Flow Pattern

Pages are React Server Components that fetch data directly, then pass to client components for interactivity:

```tsx
// src/app/page.tsx (RSC)
export default async function Page() {
  const data = await db.query.incidents.findMany(...);
  return <ClientComponent data={data} />;
}

// Mutations use Server Actions
"use server";
export async function createIncident(data) { ... }
```

### Route Structure

- `/` - Public incident feed with infinite scroll + voting (RSC + client feed)
- `/incident/[id]` - Single incident view (RSC + client detail)
- `/share` - Web Share API handler (RSC with redirect)
- `/admin/login` - Admin login (client component)
- `/admin/(dashboard)/*` - Protected admin routes (RSC layout with auth check)
- `/api/auth/[...all]` - better-auth API handler (Route Handler)
- `/api/rss` - RSS feed (Route Handler)
- `/sitemap.ts` - Dynamic sitemap
- `/robots.ts` - Robots.txt

### Schema

Core tables: `incidents` (with videos relation), `videos`, `votes`. Auth tables: `user`, `session`, `account`, `verification`.

### Path Aliases

`@/*` maps to `./src/*`

## Environment Variables

Required in `.env`:

- `TURSO_DATABASE_URL`
- `TURSO_AUTH_TOKEN`
