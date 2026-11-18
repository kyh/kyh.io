import { createClient } from "@libsql/client/web";
import { drizzle } from "drizzle-orm/libsql/web";

import { env } from "@/lib/env";
import { relations } from "./drizzle-relations";

export const db =
  env.TURSO_DATABASE_URL === undefined
    ? undefined
    : drizzle({
        client: createClient({
          authToken: env.TURSO_AUTH_TOKEN,
          url: env.TURSO_DATABASE_URL,
        }),
        relations,
      });
