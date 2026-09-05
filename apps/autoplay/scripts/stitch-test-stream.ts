// Stores the test stream: the newest recorded session on the public channel,
// stitched back into the one WebM stream its chunks were cut from, at the
// fixed path src/lib/test-stream.ts plays from. Run it after a live session
// whose look is worth keeping, or after the store has been cleared.
//
//   pnpm -F @repo/autoplay stitch-test-stream                 # from production
//   pnpm -F @repo/autoplay stitch-test-stream --from http://127.0.0.1:3005
//   pnpm -F @repo/autoplay stitch-test-stream --session <id>  # not the newest
//
// Needs BLOB_READ_WRITE_TOKEN in .env; the sessions come off the public
// replay route, so no sign-in.
import { put } from "@vercel/blob";

import { replayPayloadSchema } from "@/lib/api-contract";
import { env } from "@/lib/env";
import { TEST_STREAM_PATH } from "@/lib/test-stream";

type Args = { from: string; session?: string };

const parseArgs = (argv: string[]): Args => {
  const args: Args = { from: "https://autoplay.kyh.io" };
  for (let i = 0; i < argv.length; i++) {
    const flag = argv[i];
    const value = argv[i + 1];
    if (flag === "--from" && value !== undefined) args.from = value.replace(/\/$/, "");
    else if (flag === "--session" && value !== undefined) args.session = value;
    else throw new Error(`Unknown or incomplete option: ${flag}`);
    i += 1;
  }
  return args;
};

const main = async () => {
  if (env.BLOB_READ_WRITE_TOKEN === undefined) {
    throw new Error("BLOB_READ_WRITE_TOKEN is not set");
  }
  const args = parseArgs(process.argv.slice(2));
  const response = await fetch(`${args.from}/api/replay?sourceId=owner`);
  if (!response.ok) throw new Error(`${args.from}: replay route answered ${response.status}`);
  const { sessions } = replayPayloadSchema.parse(await response.json());
  const session =
    args.session === undefined
      ? sessions[0]
      : sessions.find((entry) => entry.sessionId === args.session);
  if (session === undefined) throw new Error("No such session recorded");

  const chunks = session.chunks.toSorted((a, b) => a.index - b.index);
  const parts: Uint8Array[] = [];
  for (const chunk of chunks) {
    const file = await fetch(chunk.url);
    if (!file.ok) throw new Error(`Chunk ${chunk.index} answered ${file.status}`);
    parts.push(new Uint8Array(await file.arrayBuffer()));
  }
  const bytes = new Uint8Array(parts.reduce((total, part) => total + part.length, 0));
  let offset = 0;
  for (const part of parts) {
    bytes.set(part, offset);
    offset += part.length;
  }
  const seconds = chunks.reduce((total, chunk) => total + chunk.seconds, 0);

  const stored = await put(TEST_STREAM_PATH, bytes, {
    access: "public",
    contentType: "video/webm",
    addRandomSuffix: false,
    allowOverwrite: true,
    token: env.BLOB_READ_WRITE_TOKEN,
  });
  console.log(
    `${session.sessionId}: ${chunks.length} chunks, ${seconds.toFixed(0)}s, ${(bytes.length / 1e6).toFixed(1)} MB, ${session.formatLabel}`,
  );
  console.log(stored.url);
};

await main();
