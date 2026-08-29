import { z } from "zod";

import { kvConfig } from "@/lib/env";

// Tiny client for an Upstash-compatible Redis REST endpoint (Vercel KV or
// Upstash directly), used as the shared clip archive. Everything degrades:
// with no store configured, reads come back empty and writes are dropped, so
// the app still runs as a per-session experience in local dev.

const commandResponseSchema = z.object({
  result: z.union([z.string(), z.number(), z.null()]),
});

type CommandResult = string | number | null;

const command = async (parts: (string | number)[]): Promise<CommandResult> => {
  const config = kvConfig();
  if (config === undefined) return null;
  try {
    const response = await fetch(config.url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${config.token}`,
      },
      body: JSON.stringify(parts),
      cache: "no-store",
    });
    if (!response.ok) return null;
    return commandResponseSchema.parse(await response.json()).result;
  } catch {
    return null;
  }
};

export const kvGet = async (key: string): Promise<string | undefined> => {
  const result = await command(["GET", key]);
  return result === null || result === 0 ? undefined : String(result);
};

export const kvSet = async (key: string, value: string, ttlSeconds?: number): Promise<void> => {
  if (ttlSeconds === undefined) {
    await command(["SET", key, value]);
  } else {
    await command(["SET", key, value, "EX", ttlSeconds]);
  }
};

export const kvDel = async (key: string): Promise<void> => {
  await command(["DEL", key]);
};

/** Increment and return the new count (0 when the store is unavailable). */
export const kvIncr = async (key: string, ttlSeconds: number): Promise<number> => {
  const result = await command(["INCR", key]);
  if (result === null) return 0;
  const count = Number(result);
  if (count === 1) await command(["EXPIRE", key, ttlSeconds]);
  return count;
};
