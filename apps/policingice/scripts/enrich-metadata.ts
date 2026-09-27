#!/usr/bin/env npx tsx
/**
 * Enrich Incident Metadata
 *
 * Uses AI (xai/grok-3-fast) to extract metadata from incident videos:
 * - location: City and state where incident occurred
 * - description: Brief factual description of what happened
 * - incidentDate: Date of the incident (YYYY-MM-DD)
 *
 * Tracks processed incidents in .enriched-incidents.json to avoid reprocessing.
 *
 * Usage:
 *   pnpm with-env tsx scripts/enrich-metadata.ts        # Process unprocessed incidents
 *   pnpm with-env tsx scripts/enrich-metadata.ts -f     # Force reprocess all incidents
 */
import * as fs from "node:fs";
import path from "node:path";
import { parseArgs } from "node:util";
import { xai } from "@ai-sdk/xai";
import { generateText } from "ai";
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
const PROCESSED_FILE = path.join(__dirname, ".enriched-incidents.json");

const loadProcessedIds = (): Set<number> => {
  try {
    if (fs.existsSync(PROCESSED_FILE)) {
      const data = z
        .object({ processedIds: z.array(z.number()).optional() })
        .parse(JSON.parse(fs.readFileSync(PROCESSED_FILE, "utf-8")));
      return new Set(data.processedIds);
    }
  } catch {
    console.warn("Could not load processed IDs, starting fresh");
  }
  return new Set();
};

const saveProcessedIds = (ids: Set<number>) => {
  fs.writeFileSync(
    PROCESSED_FILE,
    JSON.stringify({ lastRun: new Date().toISOString(), processedIds: [...ids] }, null, 2),
  );
};

const MetadataSchema = z.object({
  description: z
    .string()
    .nullable()
    .optional()
    .describe("Brief factual description of what happened in the incident"),
  incidentDate: z
    .string()
    .nullable()
    .optional()
    .describe(
      "Date the incident occurred in YYYY-MM-DD format. If unknown, use the post/video publish date.",
    ),
  location: z
    .string()
    .nullable()
    .optional()
    .describe('City and state where incident occurred, e.g. "Minneapolis, MN"'),
});

type Incident = Awaited<ReturnType<typeof db.query.incidents.findMany>>[number] & {
  videos: { url: string; platform: string }[];
};

const getVideoContext = (videos: { url: string; platform: string }[]): string =>
  videos.map((v) => `${v.platform}: ${v.url}`).join("\n");

const partitionIncidents = (allIncidents: Incident[], processedIds: Set<number>) => {
  const toEnrich: Incident[] = [];
  let skippedAlreadyProcessed = 0;
  let skippedAlreadyComplete = 0;

  for (const incident of allIncidents) {
    if (processedIds.has(incident.id)) {
      skippedAlreadyProcessed += 1;
      continue;
    }

    const isComplete = incident.location && incident.description && incident.incidentDate;
    if (isComplete) {
      processedIds.add(incident.id);
      skippedAlreadyComplete += 1;
      continue;
    }

    toEnrich.push(incident);
  }

  return { skippedAlreadyComplete, skippedAlreadyProcessed, toEnrich };
};

const buildPrompt = (
  tweetUrls: string[],
  known: { location: boolean; description: boolean; incidentDate: boolean },
) => `You must use the x_search tool to find information about this ICE (Immigration and Customs Enforcement) incident.

The incident is documented in these tweets:
${tweetUrls.join("\n")}

Instructions:
1. Use x_search to search for these tweet URLs or extract the tweet content
2. Look for: where did this happen (city, state), what happened, when did it happen
3. If x_search doesn't find it, try web_search for news coverage of the incident

After searching, return a JSON object with:
{
  "location": "City, ST" or null if not found,
  "description": "Brief factual summary of what happened" or null if not found,
  "incidentDate": "YYYY-MM-DD" or null if not found
}

${known.location ? "Skip location - already known." : ""}
${known.description ? "Skip description - already known." : ""}
${known.incidentDate ? "Skip incidentDate - already known." : ""}

You MUST search first, then respond with ONLY the JSON object.`;

const generateMetadata = async (incident: Incident) => {
  const tweetUrls = incident.videos.filter((v) => v.platform === "twitter").map((v) => v.url);

  const { text, sources, toolResults } = await generateText({
    model: xai.responses("grok-4-fast"),
    prompt: buildPrompt(tweetUrls, {
      description: Boolean(incident.description),
      incidentDate: Boolean(incident.incidentDate),
      location: Boolean(incident.location),
    }),
    tools: {
      web_search: xai.tools.webSearch(),
      x_search: xai.tools.xSearch(),
    },
  });

  console.log(`  LLM response:`, text);
  console.log(`  Sources:`, JSON.stringify(sources));
  console.log(`  Tool results:`, JSON.stringify(toolResults));

  const jsonMatch = /\{[\s\S]*\}/u.exec(text);
  if (!jsonMatch) {
    return null;
  }
  const parsed = MetadataSchema.safeParse(JSON.parse(jsonMatch[0]));
  if (!parsed.success) {
    console.log(`  Failed to parse response:`, parsed.error);
    return null;
  }
  return parsed.data;
};

const enrichIncident = async (incident: Incident) => {
  const generated = await generateMetadata(incident);
  const location = incident.location || generated?.location || incident.location;
  const description = incident.description || generated?.description || incident.description;
  const incidentDate =
    incident.incidentDate ||
    (generated?.incidentDate ? new Date(generated.incidentDate) : incident.incidentDate);

  const hasChanges =
    location !== incident.location ||
    description !== incident.description ||
    incidentDate?.getTime() !== incident.incidentDate?.getTime();

  if (hasChanges) {
    await db
      .update(schema.incidents)
      .set({ description, incidentDate, location })
      .where(eq(schema.incidents.id, incident.id));
    console.log(`  Updated metadata`);
  } else {
    console.log(`  No updates needed`);
  }
};

const main = async () => {
  const processedIds = args.force ? new Set<number>() : loadProcessedIds();

  if (args.force) {
    console.log("Force mode: ignoring previously processed incidents");
  } else {
    console.log(`Already processed ${processedIds.size} incidents`);
  }

  console.log("Fetching all incidents from database...");
  const allIncidents = await db.query.incidents.findMany({
    with: { videos: true },
  });
  console.log(`Found ${allIncidents.length} total incidents`);

  const { skippedAlreadyComplete, skippedAlreadyProcessed, toEnrich } = partitionIncidents(
    allIncidents,
    processedIds,
  );

  if (skippedAlreadyComplete > 0) {
    console.log(`Skipped ${skippedAlreadyComplete} incidents already complete in DB`);
    saveProcessedIds(processedIds);
  }
  if (skippedAlreadyProcessed > 0) {
    console.log(`Skipped ${skippedAlreadyProcessed} incidents already in processed file`);
  }

  console.log(`Found ${toEnrich.length} incidents to enrich`);

  for (const incident of toEnrich) {
    console.log(`\nProcessing incident ${incident.id}...`);

    const videoContext = getVideoContext(
      incident.videos.map((v) => ({ platform: v.platform, url: v.url })),
    );

    if (!videoContext) {
      console.log(`  No videos, skipping`);
      processedIds.add(incident.id);
      continue;
    }

    try {
      await enrichIncident(incident);
      processedIds.add(incident.id);
      saveProcessedIds(processedIds);
    } catch (error) {
      console.error(`  Error:`, error);
      // Left out of the processed file on purpose so the next run retries it
    }
  }

  saveProcessedIds(processedIds);
  console.log("\nDone!");
};

try {
  await main();
} catch (error) {
  console.error(error);
}
