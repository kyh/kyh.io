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

type Args = {
  code?: string;
  count: number;
  maxUses: number | null;
  expiresDays?: number;
  note?: string;
  list: boolean;
  revoke?: string;
};

const usage = `Usage: pnpm -F @repo/autoplay invite [--code CODE] [--count n] [--max-uses n|unlimited]
                                     [--expires-days n] [--note text] [--list] [--revoke CODE]`;

const readArgs = (argv: string[]): Args => {
  const parse = () =>
    parseArgs({
      args: argv,
      strict: true,
      options: {
        code: { type: "string" },
        count: { type: "string", default: "1" },
        "max-uses": { type: "string", default: "1" },
        "expires-days": { type: "string" },
        note: { type: "string" },
        list: { type: "boolean", default: false },
        revoke: { type: "string" },
      },
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
    maxUses:
      values["max-uses"] === "unlimited" || values["max-uses"] === "0"
        ? null
        : Number(values["max-uses"]),
    expiresDays: values["expires-days"] === undefined ? undefined : Number(values["expires-days"]),
    note: values.note,
    list: values.list,
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

const main = async () => {
  if (db === undefined) throw new Error("TURSO_DATABASE_URL is not set");
  const args = readArgs(process.argv.slice(2));

  if (args.list) {
    const codes = await db.select().from(inviteCode).orderBy(asc(inviteCode.createdAt));
    const users = await db
      .select({ username: user.username, code: user.invitedByCode })
      .from(user)
      .orderBy(asc(user.createdAt));
    for (const row of codes) {
      const cap = row.maxUses === null ? "∞" : String(row.maxUses);
      const state =
        row.revokedAt !== null
          ? "revoked"
          : row.expiresAt !== null && row.expiresAt < Date.now()
            ? "expired"
            : row.maxUses !== null && row.usedCount >= row.maxUses
              ? "spent"
              : "open";
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
  if (args.code !== undefined) {
    const code = normalizeInviteCode(args.code);
    if (!isWellFormedInviteCode(code)) {
      throw new Error(`a code is six letters or digits; got ${code}`);
    }
    codes.push(code);
  } else {
    const set = new Set<string>();
    while (set.size < args.count) set.add(generateInviteCode());
    codes.push(...set);
  }
  const expiresAt =
    args.expiresDays === undefined ? null : Date.now() + args.expiresDays * 86_400_000;
  await db.insert(inviteCode).values(
    codes.map((code) => ({
      id: crypto.randomUUID(),
      code,
      maxUses: args.maxUses,
      expiresAt,
      note: args.note ?? null,
      createdAt: Date.now(),
    })),
  );
  for (const code of codes) console.log(code);
};

await main();
