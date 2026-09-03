// One-off data migration for the lineup model. Run once against the
// production archive after `pnpm db:push` has created the `source` table:
//
//   pnpm -F @repo/autoplay with-env node scripts/migrate-lineup.mjs
//
// What it does, idempotently:
//   1. backs up clip + channel_clip + pending_job to ./autoplay-backup-*.json
//   2. re-keys X clips from a bare post id to `x:{id}` — copy, repoint the
//      channel_clip rows, delete the original, which respects the foreign key
//   3. drops the `u:*` personal channels (duplicates of CH 01 for its only user)
//   4. drops pending jobs, whose JSON predates the item schema and has expired
// Delete this file once production has been migrated.
import { writeFileSync } from "node:fs";
import { createClient } from "@libsql/client";

const url = process.env.TURSO_DATABASE_URL;
if (url === undefined) throw new Error("TURSO_DATABASE_URL is not set");
const c = createClient({ url, authToken: process.env.TURSO_AUTH_TOKEN });
const q = async (sql, args = []) => (await c.execute({ sql, args })).rows;

const backup = {
  clip: await q("select * from clip"),
  channel_clip: await q("select * from channel_clip"),
  pending_job: await q("select * from pending_job"),
};
const file = `autoplay-backup-${Date.now()}.json`;
writeFileSync(file, JSON.stringify(backup));
console.log(
  "backup",
  file,
  "clips",
  backup.clip.length,
  "channel_clip",
  backup.channel_clip.length,
);

const cols =
  "video_url, text, author_name, author_username, author_image, post_created_at, score, last_frame_url, generated_at";
const bare = await q("select post_id from clip where post_id not like '%:%'");
console.log("clips to re-key:", bare.length);
for (const { post_id } of bare) {
  const id = String(post_id);
  await c.batch(
    [
      {
        sql: `insert or ignore into clip (post_id, ${cols}) select 'x:' || post_id, ${cols} from clip where post_id = ?`,
        args: [id],
      },
      { sql: "update channel_clip set post_id = 'x:' || post_id where post_id = ?", args: [id] },
      { sql: "delete from clip where post_id = ?", args: [id] },
    ],
    "write",
  );
}
const personal = await q(
  "select channel_key, count(*) n from channel_clip where channel_key like 'u:%' group by channel_key",
);
console.log("personal channels dropped:", JSON.stringify(personal));
await q("delete from channel_clip where channel_key like 'u:%'");
await q("delete from pending_job");

console.log(
  "after: clips",
  (await q("select count(*) n from clip"))[0].n,
  "bare",
  (await q("select count(*) n from clip where post_id not like '%:%'"))[0].n,
  "channel_clip",
  JSON.stringify(await q("select channel_key, count(*) n from channel_clip group by channel_key")),
  "orphans",
  (
    await q(
      "select count(*) n from channel_clip cc left join clip c on c.post_id = cc.post_id where c.post_id is null",
    )
  )[0].n,
);
