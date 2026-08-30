import { createClient } from "@libsql/client/web";
import { drizzle } from "drizzle-orm/libsql/web";

import { env } from "@/lib/env";
import * as schema from "./drizzle-schema";

// Unlike policingice, the database is optional: without TURSO_DATABASE_URL
// the archive degrades to in-memory maps (see src/lib/channel.ts) so local
// dev works with no infrastructure.
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
