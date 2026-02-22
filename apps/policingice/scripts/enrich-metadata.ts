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
import * as path from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";
import { xai } from "@ai-sdk/xai";
import { generateText } from "ai";
import { eq } from "drizzle-orm";
import { z } from "zod";

const { db } = await import("../src/db/drizzle-client");
const schema = await import("../src/db/drizzle-schema");

const { values: args } = parseArgs({
  options: {
    force: { type: "boolean", short: "f", default: false },
  },
});

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROCESSED_FILE = path.join(__dirname, ".enriched-incidents.json");

function loadProcessedIds(): Set<number> {
  try {
    if (fs.existsSync(PROCESSED_FILE)) {
      const data = JSON.parse(fs.readFileSync(PROCESSED_FILE, "utf-8")) as {
        processedIds?: number[];
      };
      return new Set(data.processedIds ?? []);
    }
  } catch {
    console.warn("Could not load processed IDs, starting fresh");
  }
  return new Set();
}

function saveProcessedIds(ids: Set<number>) {
  fs.writeFileSync(
    PROCESSED_FILE,
    JSON.stringify(
      { processedIds: [...ids], lastRun: new Date().toISOString() },
      null,
      2,
    ),
  );
}

const MetadataSchema = z.object({
  location: z
    .string()
    .nullable()
    .describe('City and state where incident occurred, e.g. "Minneapolis, MN"'),
  description: z
    .string()
    .nullable()
    .describe("Brief factual description of what happened in the incident"),
  incidentDate: z
    .string()
    .nullable()
    .describe(
      "Date the incident occurred in YYYY-MM-DD format. If unknown, use the post/video publish date.",
    ),
});

function getVideoContext(
  videos: { url: string; platform: string }[],
): string {
  return videos.map((v) => `${v.platform}: ${v.url}`).join("\n");
}

async function main() {
  const processedIds = args.force ? new Set<number>() : loadProcessedIds();

  if (args.force) {
    console.log("Force mode: ignoring previously processed incidents");
  } else {
    console.log(`Already processed ${processedIds.size} incidents`);
  }

  // Fetch ALL incidents in one query, then partition locally
  console.log("Fetching all incidents from database...");
  const allIncidents = await db.query.incidents.findMany({
    with: { videos: true },
  });
  console.log(`Found ${allIncidents.length} total incidents`);

  // Partition: already complete vs needs enrichment
  const incidentsToEnrich: typeof allIncidents = [];
  let skippedAlreadyProcessed = 0;
  let skippedAlreadyComplete = 0;

  for (const incident of allIncidents) {
    // Skip if already in processed file (unless force mode)
    if (processedIds.has(incident.id)) {
      skippedAlreadyProcessed++;
      continue;
    }

    // Check if already has all metadata in DB
    const isComplete =
      incident.location && incident.description && incident.incidentDate;

    if (isComplete) {
      // Already complete in DB, add to processed file and skip
      processedIds.add(incident.id);
      skippedAlreadyComplete++;
      continue;
    }

    incidentsToEnrich.push(incident);
  }

  if (skippedAlreadyComplete > 0) {
    console.log(
      `Skipped ${skippedAlreadyComplete} incidents already complete in DB`,
    );
    saveProcessedIds(processedIds);
  }
  if (skippedAlreadyProcessed > 0) {
    console.log(
      `Skipped ${skippedAlreadyProcessed} incidents already in processed file`,
    );
  }

  console.log(`Found ${incidentsToEnrich.length} incidents to enrich`);

  for (const incident of incidentsToEnrich) {
    console.log(`\nProcessing incident ${incident.id}...`);

    const videoContext = getVideoContext(
      incident.videos.map((v) => ({ url: v.url, platform: v.platform })),
    );

    if (!videoContext) {
      console.log(`  No videos, skipping`);
      processedIds.add(incident.id);
      continue;
    }

    try {
      let description = incident.description;
      let location = incident.location;
      let incidentDate = incident.incidentDate;

      // Generate metadata if missing
      if (!location || !description || !incidentDate) {
        // Extract tweet URLs for X source search
        const tweetUrls = incident.videos
          .filter((v) => v.platform === "twitter")
          .map((v) => v.url);

        const { text, sources, toolResults } = await generateText({
          model: xai.responses("grok-4-fast"),
          tools: {
            web_search: xai.tools.webSearch(),
            x_search: xai.tools.xSearch(),
          },
          prompt: `You must use the x_search tool to find information about this ICE (Immigration and Customs Enforcement) incident.

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

${location ? "Skip location - already known." : ""}
${description ? "Skip description - already known." : ""}
${incidentDate ? "Skip incidentDate - already known." : ""}

You MUST search first, then respond with ONLY the JSON object.`,
        });

        console.log(`  LLM response:`, text);
        console.log(`  Sources:`, JSON.stringify(sources));
        console.log(`  Tool results:`, JSON.stringify(toolResults));

        // Parse JSON from response
        const jsonMatch = /\{[\s\S]*\}/.exec(text);
        if (jsonMatch) {
          const parsed = MetadataSchema.safeParse(JSON.parse(jsonMatch[0]));
          if (parsed.success) {
            if (!location && parsed.data.location) {
              location = parsed.data.location;
            }
            if (!description && parsed.data.description) {
              description = parsed.data.description;
            }
            if (!incidentDate && parsed.data.incidentDate) {
              incidentDate = new Date(parsed.data.incidentDate);
            }
          } else {
            console.log(`  Failed to parse response:`, parsed.error);
          }
        }
      }

      const hasChanges =
        location !== incident.location ||
        description !== incident.description ||
        incidentDate?.getTime() !== incident.incidentDate?.getTime();

      if (hasChanges) {
        await db
          .update(schema.incidents)
          .set({ location, description, incidentDate })
          .where(eq(schema.incidents.id, incident.id));
        console.log(`  Updated metadata`);
      } else {
        console.log(`  No updates needed`);
      }

      processedIds.add(incident.id);
      saveProcessedIds(processedIds);
    } catch (error) {
      console.error(`  Error:`, error);
      // Don't mark as processed on error so we retry next time
    }
  }

  saveProcessedIds(processedIds);
  console.log("\nDone!");
}

main().catch(console.error);
