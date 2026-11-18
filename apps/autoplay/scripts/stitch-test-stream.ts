import { parseArgs } from "node:util";
import { put } from "@vercel/blob";

import { replayPayloadSchema } from "@/lib/api-contract";
import { env } from "@/lib/env";
import { OWNER_SOURCE_ID } from "@/lib/source-kinds";
import { TEST_STREAM_PATH } from "@/lib/test-stream";

const main = async () => {
  if (env.BLOB_READ_WRITE_TOKEN === undefined) {
    throw new Error("BLOB_READ_WRITE_TOKEN is not set");
  }

  const { values: args } = parseArgs({
    args: process.argv.slice(2),
    options: {
      from: { default: "https://autoplay.kyh.io", type: "string" },
      session: { type: "string" },
    },
    strict: true,
  });

  const from = args.from.replace(/\/$/u, "");
  const response = await fetch(`${from}/api/replay?sourceId=${OWNER_SOURCE_ID}`);

  if (!response.ok) {
    throw new Error(`${from}: replay route answered ${response.status}`);
  }

  const { sessions } = replayPayloadSchema.parse(await response.json());

  const session =
    args.session === undefined
      ? sessions[0]
      : sessions.find((entry) => entry.sessionId === args.session);

  if (session === undefined) {
    throw new Error("No such session recorded");
  }

  const chunks = session.chunks.toSorted((a, b) => a.index - b.index);
  const parts: Uint8Array[] = [];

  for (const chunk of chunks) {
    const file = await fetch(chunk.url);

    if (!file.ok) {
      throw new Error(`Chunk ${chunk.index} answered ${file.status}`);
    }

    parts.push(new Uint8Array(await file.arrayBuffer()));
  }

  const bytes = new Uint8Array(parts.reduce((total, part) => total + part.length, 0));
  let offset = 0;

  for (const part of parts) {
    bytes.set(part, offset);
    offset += part.length;
  }

  const seconds = chunks.reduce((total, chunk) => total + chunk.seconds, 0);

  const stored = await put(TEST_STREAM_PATH, new Blob([bytes], { type: "video/webm" }), {
    access: "public",
    addRandomSuffix: false,
    allowOverwrite: true,
    contentType: "video/webm",
    token: env.BLOB_READ_WRITE_TOKEN,
  });

  console.log(
    `${session.sessionId}: ${chunks.length} chunks, ${seconds.toFixed(0)}s, ${(bytes.length / 1e6).toFixed(1)} MB, ${session.formatLabel}`,
  );
  console.log(stored.url);
};

await main();
