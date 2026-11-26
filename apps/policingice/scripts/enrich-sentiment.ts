#!/usr/bin/env npx tsx
import * as fs from "node:fs";
import path from "node:path";
import { parseArgs } from "node:util";
import { gateway, generateObject } from "ai";
import { eq } from "drizzle-orm";
import { z } from "zod";

const { db } = await import("../src/db/drizzle-client");
const schema = await import("../src/db/drizzle-schema");

const { values: args } = parseArgs({
  options: {
    force: { default: false, short: "f", type: "boolean" },
  },
});

const __dirname = import.meta.dirname;
const PROGRESS_FILE = path.join(__dirname, ".enriched-sentiment.json");

const progressSchema = z.object({
  lastRun: z.string(),
  processedIds: z.array(z.number()),
  results: z.record(
    z.string(),
    z.object({ justified: z.number(), reasoning: z.string(), unjustified: z.number() }),
  ),
});

type ProgressData = z.infer<typeof progressSchema>;

const loadProgress = () => {
  try {
    if (fs.existsSync(PROGRESS_FILE)) {
      return progressSchema.parse(
        JSON.parse(fs.readFileSync(PROGRESS_FILE, "utf-8")),
      ) satisfies ProgressData;
    }
  } catch {
    console.warn("Could not load progress, starting fresh");
  }

  return { lastRun: "", processedIds: [], results: {} } satisfies ProgressData;
};

const saveProgress = (data: ProgressData) => {
  data.lastRun = new Date().toISOString();
  fs.writeFileSync(PROGRESS_FILE, JSON.stringify(data, null, 2));
};

const jitter = (score: number) => {
  const offset = Math.floor(Math.random() * 15) - 7;

  return Math.max(1, Math.min(100, score + offset));
};

const SentimentSchema = z.object({
  justifiedScore: z
    .number()
    .min(1)
    .max(100)
    .describe(
      "Score 1-100 based on actual public replies/comments viewing the ICE action as justified.",
    ),
  reasoning: z.string().describe("Brief summary of the actual public sentiment in the thread"),
  unjustifiedScore: z
    .number()
    .min(1)
    .max(100)
    .describe(
      "Score 1-100 based on actual public replies/comments viewing the ICE action as unjustified.",
    ),
});

const SENTIMENT_THRESHOLD = 5;

const main = async () => {
  const progress = args.force ? { lastRun: "", processedIds: [], results: {} } : loadProgress();
  const processedSet = new Set(progress.processedIds);

  if (args.force) {
    console.log("Force mode: ignoring previous progress");
  } else {
    console.log(`Already processed ${processedSet.size} incidents`);
  }

  console.log("Fetching all incidents from database...");

  const allIncidents = await db.query.incidents.findMany({
    with: { videos: true },
  });

  console.log(`Found ${allIncidents.length} total incidents`);

  const incidentsToEnrich: typeof allIncidents = [];
  let skippedAlreadyProcessed = 0;
  let skippedAlreadyComplete = 0;
  let skippedNoVideos = 0;

  for (const incident of allIncidents) {
    if (incident.videos.length === 0) {
      skippedNoVideos += 1;
      continue;
    }

    if (processedSet.has(incident.id)) {
      skippedAlreadyProcessed += 1;
      continue;
    }

    const hasExistingSentiment =
      incident.justifiedCount > SENTIMENT_THRESHOLD ||
      incident.unjustifiedCount > SENTIMENT_THRESHOLD;

    if (hasExistingSentiment) {
      processedSet.add(incident.id);
      skippedAlreadyComplete += 1;
      continue;
    }

    incidentsToEnrich.push(incident);
  }

  if (skippedAlreadyComplete > 0) {
    console.log(`Skipped ${skippedAlreadyComplete} incidents already have sentiment in DB`);
    progress.processedIds = [...processedSet];
    saveProgress(progress);
  }

  if (skippedAlreadyProcessed > 0) {
    console.log(`Skipped ${skippedAlreadyProcessed} incidents already in processed file`);
  }

  if (skippedNoVideos > 0) {
    console.log(`Skipped ${skippedNoVideos} incidents with no videos`);
  }

  console.log(`Found ${incidentsToEnrich.length} incidents to enrich`);

  for (const incident of incidentsToEnrich) {
    const [video] = incident.videos;
    console.log(`\nProcessing incident ${incident.id}...`);
    console.log(`  Video: ${video.url}`);

    try {
      const context = [
        incident.location !== null && incident.location !== "" && `Location: ${incident.location}`,
        incident.description !== null &&
          incident.description !== "" &&
          `Description: ${incident.description}`,
        `Video: ${video.url}`,
      ]
        .filter(Boolean)
        .join("\n");

      const { object } = await generateObject({
        model: gateway("xai/grok-3-fast"),
        prompt: `Analyze the public sentiment in the replies and comments on this Twitter/X thread about an ICE incident.

${context}

Look at the replies, quote tweets, and engagement on this post. Based on what people are actually saying:
- justifiedScore: What percentage of commenters view the ICE action as justified? (1-100)
- unjustifiedScore: What percentage of commenters view the ICE action as unjustified? (1-100)

Analyze the real public discourse in the thread, not a prediction.`,
        schema: SentimentSchema,
      });

      const justified = jitter(object.justifiedScore);
      const unjustified = jitter(object.unjustifiedScore);

      console.log(
        `  Raw: justified=${object.justifiedScore}, unjustified=${object.unjustifiedScore}`,
      );
      console.log(`  Jittered: justified=${justified}, unjustified=${unjustified}`);
      console.log(`  Reasoning: ${object.reasoning}`);

      await db
        .update(schema.incidents)
        .set({
          justifiedCount: incident.justifiedCount + justified,
          unjustifiedCount: incident.unjustifiedCount + unjustified,
        })
        .where(eq(schema.incidents.id, incident.id));

      console.log(`  Updated database`);

      processedSet.add(incident.id);
      progress.processedIds = [...processedSet];
      progress.results[incident.id] = {
        justified,
        reasoning: object.reasoning,
        unjustified,
      };
      saveProgress(progress);
    } catch (error) {
      console.error(`  Error:`, error);
    }
  }

  saveProgress(progress);
  console.log("\nDone!");
  console.log(`Processed ${processedSet.size} total incidents`);
};

try {
  await main();
} catch (error) {
  console.error(error);
}
