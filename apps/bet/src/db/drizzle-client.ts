import { createClient } from "@libsql/client/web";
import { drizzle } from "drizzle-orm/libsql/web";

import * as schema from "./drizzle-schema";

const getClient = () =>
  createClient({
    url: process.env.TURSO_DATABASE_URL!,
    authToken: process.env.TURSO_AUTH_TOKEN,
  });

let _client: ReturnType<typeof getClient> | undefined;
let _db: ReturnType<typeof drizzle<typeof schema>> | undefined;

export const client = new Proxy({} as ReturnType<typeof getClient>, {
  get(_, prop) {
    if (!_client) _client = getClient();
    return (_client as never)[prop];
  },
});

export const db = new Proxy({} as ReturnType<typeof drizzle<typeof schema>>, {
  get(_, prop) {
    if (!_db) _db = drizzle(client, { schema });
    return (_db as never)[prop];
  },
});
