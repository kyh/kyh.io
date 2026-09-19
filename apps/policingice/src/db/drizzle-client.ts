import { createClient } from "@libsql/client/web";
import { drizzle } from "drizzle-orm/libsql/web";

import { env } from "@/lib/env";
import { relations } from "./drizzle-relations";

export const client = createClient({
  authToken: env.TURSO_AUTH_TOKEN,
  url: env.TURSO_DATABASE_URL,
});

export const db = drizzle({ client, relations });
