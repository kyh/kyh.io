// Mint, list and revoke invite codes in the station's database.
//
//   pnpm -F @repo/autoplay invite                          # one random single-use code
//   pnpm -F @repo/autoplay invite --code VICKIE --max-uses unlimited
//   pnpm -F @repo/autoplay invite --count 5 --note "friends"
//   pnpm -F @repo/autoplay invite --expires-days 30
//   pnpm -F @repo/autoplay invite --list                   # every code, its uses, who came in on it
//   pnpm -F @repo/autoplay invite --revoke VICKIE
//
// Minted codes are six characters from an alphabet without 0/O/1/I; a --code
// of your own may use any letters or digits, and is normalised to upper case
// the way sign-up normalises what a viewer types.
// --max-uses defaults to 1; `unlimited` (or 0) lifts the cap.
import { parseArgs } from "node:util";
import { asc, eq } from "drizzle-orm";

import { db } from "@/db/drizzle-client";
import { inviteCode, user } from "@/db/drizzle-schema";
import { generateInviteCode, isWellFormedInviteCode, normalizeInviteCode } from "@/lib/invite";

const MAX_BATCH = 100;

interface Args {
  code?: string;
  count: number;
  maxUses: number | null;
  expiresDays?: number;
  note?: string;
  list: boolean;
  revoke?: string;
}

const usage = `Usage: pnpm -F @repo/autoplay invite [--code CODE] [--count n] [--max-uses n|unlimited]
                                     [--expires-days n] [--note text] [--list] [--revoke CODE]`;

const readArgs = (argv: string[]): Args => {
  const parse = () =>
    parseArgs({
      args: argv,
      options: {
        code: { type: "string" },
        count: { default: "1", type: "string" },
        "expires-days": { type: "string" },
        list: { default: false, type: "boolean" },
        "max-uses": { default: "1", type: "string" },
        note: { type: "string" },
        revoke: { type: "string" },
      },
      strict: true,
    }).values;
  let values: ReturnType<typeof parse>;
  try {
    values = parse();
  } catch (error) {
    throw new Error(`${error instanceof Error ? error.message : String(error)}\n${usage}`, {
      cause: error,
    });
  }
  const args: Args = {
    code: values.code,
    count: Number(values.count),
    expiresDays: values["expires-days"] === undefined ? undefined : Number(values["expires-days"]),
    list: values.list,
    maxUses:
      values["max-uses"] === "unlimited" || values["max-uses"] === "0"
        ? null
        : Number(values["max-uses"]),
    note: values.note,
    revoke: values.revoke,
  };
  if (!Number.isInteger(args.count) || args.count < 1 || args.count > MAX_BATCH) {
    throw new Error(`--count must be 1..${MAX_BATCH}`);
  }
  if (args.maxUses !== null && (!Number.isInteger(args.maxUses) || args.maxUses < 1)) {
    throw new Error("--max-uses must be a positive integer or unlimited");
  }
  return args;
};

const stateOf = (row: typeof inviteCode.$inferSelect): string => {
  if (row.revokedAt !== null) {
    return "revoked";
  }
  if (row.expiresAt !== null && row.expiresAt < Date.now()) {
    return "expired";
  }
  if (row.maxUses !== null && row.usedCount >= row.maxUses) {
    return "spent";
  }
  return "open";
};

const main = async () => {
  if (db === undefined) {
    throw new Error("TURSO_DATABASE_URL is not set");
  }
  const args = readArgs(process.argv.slice(2));

  if (args.list) {
    const codes = await db.select().from(inviteCode).orderBy(asc(inviteCode.createdAt));
    const users = await db
      .select({ code: user.invitedByCode, username: user.username })
      .from(user)
      .orderBy(asc(user.createdAt));
    for (const row of codes) {
      const cap = row.maxUses === null ? "∞" : String(row.maxUses);
      const state = stateOf(row);
      const invited = users
        .filter((entry) => entry.code === row.code)
        .map((entry) => `@${entry.username ?? "?"}`)
        .join(" ");
      console.log(
        `${row.code}  ${row.usedCount}/${cap}  ${state.padEnd(7)}  ${row.note ?? ""}${invited === "" ? "" : `  → ${invited}`}`,
      );
    }
    return;
  }

  if (args.revoke !== undefined) {
    const code = normalizeInviteCode(args.revoke);
    const rows = await db
      .update(inviteCode)
      .set({ revokedAt: Date.now() })
      .where(eq(inviteCode.code, code))
      .returning({ code: inviteCode.code });
    console.log(rows.length === 0 ? `no such code ${code}` : `revoked ${code}`);
    return;
  }

  const codes: string[] = [];
  if (args.code === undefined) {
    const set = new Set<string>();
    while (set.size < args.count) {
      set.add(generateInviteCode());
    }
    codes.push(...set);
  } else {
    const code = normalizeInviteCode(args.code);
    if (!isWellFormedInviteCode(code)) {
      throw new Error(`a code is six letters or digits; got ${code}`);
    }
    codes.push(code);
  }
  const expiresAt =
    args.expiresDays === undefined ? null : Date.now() + args.expiresDays * 86_400_000;
  await db.insert(inviteCode).values(
    codes.map((code) => ({
      code,
      createdAt: Date.now(),
      expiresAt,
      id: crypto.randomUUID(),
      maxUses: args.maxUses,
      note: args.note ?? null,
    })),
  );
  for (const code of codes) {
    console.log(code);
  }
};

await main();
