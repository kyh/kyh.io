import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";

import { env } from "@/lib/env";

export const db = drizzle({
  client: createClient({ authToken: env.TURSO_AUTH_TOKEN, url: env.TURSO_DATABASE_URL }),
});
