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
 * Requires: XAI_API_KEY in .env.local (via AI SDK gateway)
 *
 * Usage:
 *   npx tsx scripts/enrich-metadata.ts        # Process unprocessed incidents
 *   npx tsx scripts/enrich-metadata.ts -f     # Force reprocess all incidents
 *   npx tsx scripts/enrich-metadata.ts --force
 */
import * as fs from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";
import { gateway, generateObject } from "ai";
import { config } from "dotenv";
import { eq, isNull, or } from "drizzle-orm";
import { z } from "zod";

config({ path: ".env.local" });

const { db } = await import("../src/db/index");
const schema = await import("../src/db/schema");

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
      const data = JSON.parse(fs.readFileSync(PROCESSED_FILE, "utf-8"));
      return new Set(data.processedIds || []);
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
  videos: Array<{ url: string; platform: string }>,
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

  console.log("Finding incidents with missing metadata...");

  const processedArray = [...processedIds];
  const incidentsToEnrich = await db.query.incidents.findMany({
    where:
      processedArray.length > 0
        ? (
            t,
            { and: andOp, or: orOp, isNull: isNullOp, notInArray: notInOp },
          ) =>
            andOp(
              orOp(
                isNullOp(t.location),
                isNullOp(t.description),
                isNullOp(t.incidentDate),
              ),
              notInOp(t.id, processedArray),
            )
        : or(
            isNull(schema.incidents.location),
            isNull(schema.incidents.description),
            isNull(schema.incidents.incidentDate),
          ),
    with: { videos: true },
  });

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
        const { object } = await generateObject({
          model: gateway("xai/grok-3-fast"),
          schema: MetadataSchema,
          prompt: `Analyze this ICE (Immigration and Customs Enforcement) incident.

Video sources:
${videoContext}

${location ? "" : "Extract the location (city, state) if identifiable."}
${description ? "" : "Write a brief factual description of what happened."}
${incidentDate ? "" : "Extract the date of the incident. If not mentioned, use the post publish date."}

Return null for fields you cannot determine. Do not make up information.`,
        });

        console.log(`  LLM response:`, JSON.stringify(object));

        if (!location && object.location) {
          location = object.location;
        }
        if (!description && object.description) {
          description = object.description;
        }
        if (!incidentDate && object.incidentDate) {
          incidentDate = new Date(object.incidentDate);
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
