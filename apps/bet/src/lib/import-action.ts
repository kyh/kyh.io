"use server";

import { revalidatePath } from "next/cache";
import { xai } from "@ai-sdk/xai";
import { generateObject, generateText } from "ai";
import { z } from "zod";

import { db } from "@/db/drizzle-client";
import { predictions, user } from "@/db/drizzle-schema";
import { getSession } from "@/lib/auth";

const PredictionSchema = z.object({
  predictions: z.array(
    z.object({
      quote: z
        .string()
        .describe(
          "The exact quote from the tweet that contains the prediction",
        ),
      description: z
        .string()
        .describe("A short general description of what is being predicted"),
      background: z
        .string()
        .describe(
          "Context about why this prediction was made or what it relates to",
        ),
      madeAt: z
        .string()
        .describe("The date the tweet was posted in YYYY-MM-DD format"),
      tweetId: z
        .string()
        .optional()
        .describe("The tweet ID if available"),
    }),
  ),
});

export type ExtractedPrediction = z.infer<
  typeof PredictionSchema
>["predictions"][number];

export async function extractPredictions(handle: string) {
  const session = await getSession();
  if (!session?.user) {
    throw new Error("Unauthorized");
  }

  const cleanHandle = handle.replace(/^@/, "").trim();
  if (!cleanHandle) {
    throw new Error("Invalid handle");
  }

  const oneYearAgo = new Date();
  oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
  const fromDate = oneYearAgo.toISOString().split("T")[0];
  const toDate = new Date().toISOString().split("T")[0];

  // Step 1: Search X for tweets using Grok's x_search tool
  const { text: tweetsText } = await generateText({
    model: xai.responses("grok-3-fast"),
    tools: {
      x_search: xai.tools.xSearch({
        allowedXHandles: [cleanHandle],
        fromDate,
        toDate,
      }),
    },
    prompt: `Search X/Twitter for all tweets from @${cleanHandle} posted between ${fromDate} and ${toDate}.

Find tweets that contain predictions, forecasts, bets, or claims about the future. These could be:
- Explicit predictions ("I predict...", "I bet...", "This will happen...")
- Market/stock forecasts
- Sports predictions
- Political predictions
- Technology predictions
- Any statement about what will happen in the future

List every prediction tweet you find. For each one, include the exact tweet text, the date it was posted, and the tweet ID if available. Only include genuine predictions about future outcomes, not opinions about the present.`,
  });

  // Step 2: Extract structured predictions from the search results
  const { object } = await generateObject({
    model: xai("grok-3-fast"),
    schema: PredictionSchema,
    prompt: `Below are tweets from @${cleanHandle} that may contain predictions about the future.

Extract each prediction into a structured format. For each prediction provide:
- quote: The exact text from the tweet
- description: A short summary of what is being predicted
- background: Context about why they said it or what it relates to
- madeAt: The date the tweet was posted (YYYY-MM-DD)
- tweetId: The tweet ID if mentioned

If no predictions were found, return an empty predictions array.

Tweets found:
${tweetsText}`,
  });

  return { predictions: object.predictions, handle: cleanHandle };
}

export async function savePredictions(data: {
  handle: string;
  predictions: ExtractedPrediction[];
}) {
  const session = await getSession();
  if (!session?.user) {
    throw new Error("Unauthorized");
  }

  const cleanHandle = data.handle.replace(/^@/, "").trim();

  // Find or identify user by slug
  let targetUser = await db.query.user.findFirst({
    where: (u, { eq }) => eq(u.slug, cleanHandle),
  });

  if (!targetUser) {
    // Create a placeholder user for this twitter handle
    const id = crypto.randomUUID();
    const now = new Date();
    const [created] = await db
      .insert(user)
      .values({
        id,
        name: cleanHandle,
        slug: cleanHandle,
        email: `${cleanHandle}@x.placeholder`,
        emailVerified: false,
        createdAt: now,
        updatedAt: now,
      })
      .returning();
    targetUser = created;
  }

  const rows = data.predictions.map((p) => ({
    quote: p.quote,
    description: p.description,
    background: p.background,
    userId: targetUser.id,
    source: p.tweetId
      ? `x:${cleanHandle}:${p.tweetId}`
      : `x:${cleanHandle}`,
    madeAt: p.madeAt ? new Date(p.madeAt) : new Date(),
  }));

  // Filter out predictions with sources that already exist
  const sources = rows.map((r) => r.source);
  const existing = await db.query.predictions.findMany({
    where: (p, { inArray: inArr }) => inArr(p.source, sources),
    columns: { source: true },
  });
  const existingSources = new Set(existing.map((e) => e.source));
  const newRows = rows.filter((r) => !existingSources.has(r.source));

  if (newRows.length === 0) {
    revalidatePath("/");
    return { count: 0 };
  }

  const inserted = await db.insert(predictions).values(newRows).returning();

  revalidatePath("/");
  return { count: inserted.length };
}
