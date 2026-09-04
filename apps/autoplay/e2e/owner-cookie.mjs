// Signs a better-auth session cookie for the owner's newest live session, so
// the end-to-end run can watch as the owner without going through X. Reads
// the same .env the app does: the database the session lives in, the secret
// it is signed with, and whose handle the owner's is.
//
//   pnpm -F @repo/autoplay with-env node e2e/owner-cookie.mjs > /tmp/owner-cookie
//
// Prints the cookie for https (the __Secure- name); pass --insecure for a
// local http server, which uses the bare name.
import { createHmac } from "node:crypto";
import { createClient } from "@libsql/client";

const {
  TURSO_DATABASE_URL: url,
  TURSO_AUTH_TOKEN: authToken,
  BETTER_AUTH_SECRET: secret,
  OWNER_X_USERNAME: owner,
} = process.env;
if (!url || !secret || !owner)
  throw new Error("TURSO_DATABASE_URL, BETTER_AUTH_SECRET and OWNER_X_USERNAME are required");
const db = createClient({ url, authToken });
const rows = (
  await db.execute({
    sql: "select s.token from session s join user u on u.id = s.user_id where lower(u.username) = lower(?) and s.expires_at > ? order by s.updated_at desc limit 1",
    args: [owner, Math.floor(Date.now() / 1000)],
  })
).rows;
const token = rows[0]?.token;
if (token === undefined)
  throw new Error("the owner has no live session — sign in on the site first");
const signature = createHmac("sha256", secret).update(String(token)).digest("base64");
const name = process.argv.includes("--insecure")
  ? "autoplay.session_token"
  : "__Secure-autoplay.session_token";
console.log(`${name}=${encodeURIComponent(`${token}.${signature}`)}`);
