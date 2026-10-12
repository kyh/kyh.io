import * as z from "zod/mini";

import { renderLeaderboard } from "./page";
import { runSchema } from "./runs";
import type { Standing } from "./runs";

interface Env {
  DB: D1Database;
}

const LEADERLEADERBOARD_SIZE = 100;

// SQLite fills the bare columns from the row MAX() picked: each player's best run.
const BEST_RUNS = `
  SELECT name, MAX(tokens) AS tokens, coins, seconds, ended_at AS endedAt
  FROM runs GROUP BY name ORDER BY tokens DESC LIMIT ?`;
const PLAYERS_AHEAD = `
  SELECT COUNT(*) AS ahead FROM (SELECT MAX(tokens) AS best FROM runs GROUP BY name)
  WHERE best > (SELECT MAX(tokens) FROM runs WHERE name = ?)`;

type Answer = Standing[] | { rank: number } | { error: string };

const json = (body: Answer, status = 200) => Response.json(body, { status });

const standings = async (env: Env) => {
  const { results } = await env.DB.prepare(BEST_RUNS).bind(LEADERLEADERBOARD_SIZE).all<Standing>();
  return results;
};

// Saves the run; the answer is where its player now stands.
const post = async (request: Request, env: Env) => {
  const parsed = runSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return json({ error: z.prettifyError(parsed.error) }, 400);
  }
  const run = parsed.data;
  await env.DB.prepare(
    "INSERT INTO runs (name, tokens, coins, seconds, ended_at) VALUES (?, ?, ?, ?, ?)",
  )
    .bind(run.name, run.tokens, run.coins, run.seconds, Date.now())
    .run();
  const ahead = await env.DB.prepare(PLAYERS_AHEAD).bind(run.name).first<number>("ahead");
  return json({ rank: (ahead ?? 0) + 1 }, 201);
};

export default {
  fetch: async (request, env) => {
    const { pathname } = new URL(request.url);
    if (pathname === "/runs" && request.method === "POST") {
      return post(request, env);
    }
    if (pathname === "/runs" && request.method === "GET") {
      return json(await standings(env));
    }
    if (pathname === "/" && request.method === "GET") {
      return new Response(renderLeaderboard(await standings(env)), {
        headers: {
          "cache-control": "public, max-age=10",
          "content-type": "text/html; charset=utf-8",
        },
      });
    }
    return json({ error: "not found" }, 404);
  },
} satisfies ExportedHandler<Env>;
