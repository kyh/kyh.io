#!/usr/bin/env npx tsx
/**
 * Seed Sentiment Scores
 *
 * Analyzes public sentiment from Twitter/X threads about ICE incidents using AI.
 * Updates justifiedCount and unjustifiedCount fields based on reply sentiment analysis.
 *
 * Tracks progress in .seed-sentiment.json to allow resumption if interrupted.
 *
 * Usage:
 *   pnpm with-env tsx scripts/seed-sentiment.ts        # Process unprocessed incidents
 *   pnpm with-env tsx scripts/seed-sentiment.ts -f     # Force reprocess all incidents
 */
import * as fs from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";
import { gateway, generateObject } from "ai";
import { eq } from "drizzle-orm";
import { z } from "zod";

const { db } = await import("../src/db/index");
const schema = await import("../src/db/schema");

const { values: args } = parseArgs({
  options: {
    force: { type: "boolean", short: "f", default: false },
  },
});

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROGRESS_FILE = path.join(__dirname, ".seed-sentiment.json");

type ProgressData = {
  processedIds: number[];
  results: Record<
    number,
    { justified: number; unjustified: number; reasoning: string }
  >;
  lastRun: string;
};

function loadProgress(): ProgressData {
  try {
    if (fs.existsSync(PROGRESS_FILE)) {
      return JSON.parse(fs.readFileSync(PROGRESS_FILE, "utf-8"));
    }
  } catch {
    console.warn("Could not load progress, starting fresh");
  }
  return { processedIds: [], results: {}, lastRun: "" };
}

function saveProgress(data: ProgressData) {
  data.lastRun = new Date().toISOString();
  fs.writeFileSync(PROGRESS_FILE, JSON.stringify(data, null, 2));
}

// Add random jitter to score (±7) while keeping within 1-100
function jitter(score: number): number {
  const offset = Math.floor(Math.random() * 15) - 7; // -7 to +7
  return Math.max(1, Math.min(100, score + offset));
}

const SentimentSchema = z.object({
  justifiedScore: z
    .number()
    .min(1)
    .max(100)
    .describe(
      "Score 1-100 based on actual public replies/comments viewing the ICE action as justified.",
    ),
  unjustifiedScore: z
    .number()
    .min(1)
    .max(100)
    .describe(
      "Score 1-100 based on actual public replies/comments viewing the ICE action as unjustified.",
    ),
  reasoning: z
    .string()
    .describe("Brief summary of the actual public sentiment in the thread"),
});

async function main() {
  const progress = args.force
    ? { processedIds: [], results: {}, lastRun: "" }
    : loadProgress();
  const processedSet = new Set(progress.processedIds);

  if (args.force) {
    console.log("Force mode: ignoring previous progress");
  } else {
    console.log(`Already processed ${processedSet.size} incidents`);
  }

  console.log("Finding incidents with videos...");

  const incidents = await db.query.incidents.findMany({
    with: { videos: true },
  });

  const toProcess = incidents.filter(
    (i) => !processedSet.has(i.id) && i.videos.length > 0,
  );

  console.log(`Found ${toProcess.length} incidents to process`);

  for (const incident of toProcess) {
    const video = incident.videos[0];
    console.log(`\nProcessing incident ${incident.id}...`);
    console.log(`  Video: ${video.url}`);

    try {
      const context = [
        incident.location && `Location: ${incident.location}`,
        incident.description && `Description: ${incident.description}`,
        `Video: ${video.url}`,
      ]
        .filter(Boolean)
        .join("\n");

      const { object } = await generateObject({
        model: gateway("xai/grok-3-fast"),
        schema: SentimentSchema,
        prompt: `Analyze the public sentiment in the replies and comments on this Twitter/X thread about an ICE incident.

${context}

Look at the replies, quote tweets, and engagement on this post. Based on what people are actually saying:
- justifiedScore: What percentage of commenters view the ICE action as justified? (1-100)
- unjustifiedScore: What percentage of commenters view the ICE action as unjustified? (1-100)

Analyze the real public discourse in the thread, not a prediction.`,
      });

      const justified = jitter(object.justifiedScore);
      const unjustified = jitter(object.unjustifiedScore);

      console.log(
        `  Raw: justified=${object.justifiedScore}, unjustified=${object.unjustifiedScore}`,
      );
      console.log(
        `  Jittered: justified=${justified}, unjustified=${unjustified}`,
      );
      console.log(`  Reasoning: ${object.reasoning}`);

      // Add sentiment scores to existing counts
      await db
        .update(schema.incidents)
        .set({
          justifiedCount: incident.justifiedCount + justified,
          unjustifiedCount: incident.unjustifiedCount + unjustified,
        })
        .where(eq(schema.incidents.id, incident.id));

      console.log(`  Updated database`);

      // Save progress
      processedSet.add(incident.id);
      progress.processedIds = [...processedSet];
      progress.results[incident.id] = {
        justified,
        unjustified,
        reasoning: object.reasoning,
      };
      saveProgress(progress);
    } catch (error) {
      console.error(`  Error:`, error);
      // Don't mark as processed on error so we retry next time
    }
  }

  saveProgress(progress);
  console.log("\nDone!");
  console.log(`Processed ${processedSet.size} total incidents`);
}

main().catch(console.error);
