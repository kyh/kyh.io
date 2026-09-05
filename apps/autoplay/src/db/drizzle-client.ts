import { createClient } from "@libsql/client/web";
import { drizzle } from "drizzle-orm/libsql/web";

import { env } from "@/lib/env";
import * as schema from "./drizzle-schema";

// Unlike policingice, the database is optional: without TURSO_DATABASE_URL
// what aired and what was recorded live in server memory (see src/lib/live.ts
// and src/lib/recordings.ts), so local dev works with no infrastructure —
// short of sign-in, which needs somewhere to keep users.
export const db =
  env.TURSO_DATABASE_URL === undefined
    ? undefined
    : drizzle(
        createClient({
          url: env.TURSO_DATABASE_URL,
          authToken: env.TURSO_AUTH_TOKEN,
        }),
        { schema },
      );
