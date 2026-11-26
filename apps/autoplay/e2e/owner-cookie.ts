import { createHmac } from "node:crypto";
import { createClient } from "@libsql/client";
import { z } from "zod";

const {
  TURSO_DATABASE_URL: url,
  TURSO_AUTH_TOKEN: authToken,
  BETTER_AUTH_SECRET: secret,
  OWNER_X_USERNAME: owner,
} = process.env;

if (
  url === undefined ||
  url === "" ||
  secret === undefined ||
  secret === "" ||
  owner === undefined ||
  owner === ""
) {
  throw new Error("TURSO_DATABASE_URL, BETTER_AUTH_SECRET and OWNER_X_USERNAME are required");
}

const db = createClient({ authToken, url });

const { rows } = await db.execute({
  args: [owner, Math.floor(Date.now() / 1000)],
  sql: "select s.token from session s join user u on u.id = s.user_id where lower(u.username) = lower(?) and s.expires_at > ? order by s.updated_at desc limit 1",
});

const live = z.object({ token: z.string() }).safeParse(rows[0]);

if (!live.success) {
  throw new Error("the owner has no live session — sign in on the site first");
}

const { token } = live.data;
const signature = createHmac("sha256", secret).update(token).digest("base64");

const name = process.argv.includes("--insecure")
  ? "autoplay.session_token"
  : "__Secure-autoplay.session_token";

console.log(`${name}=${encodeURIComponent(`${token}.${signature}`)}`);
