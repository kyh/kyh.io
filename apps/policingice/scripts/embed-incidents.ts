#!/usr/bin/env npx tsx
/**
 * Embed Incidents
 *
 * Generates vector embeddings for incidents using OpenAI's text-embedding-3-small model.
 * Only processes incidents that have a description but no embedding yet.
 * Creates a vector index on the incidents table if it doesn't exist.
 *
 * Usage:
 *   pnpm with-env tsx scripts/embed-incidents.ts
 */
import { embed } from "ai";

const { client, db } = await import("../src/db/index");

async function generateEmbedding(text: string): Promise<number[]> {
  const { embedding } = await embed({
    model: "openai/text-embedding-3-small",
    value: text,
  });
  return embedding;
}

function vectorToString(vector: number[]): string {
  return `[${vector.join(",")}]`;
}

async function ensureVectorIndex() {
  try {
    await client.execute(`
      CREATE INDEX IF NOT EXISTS incidents_embedding_idx
      ON incidents(libsql_vector_idx(embedding))
    `);
    console.log("Vector index ready");
  } catch {
    console.log("Note: Vector index creation skipped (may already exist)");
  }
}

async function main() {
  await ensureVectorIndex();

  console.log("Finding incidents with descriptions but no embeddings...");

  const incidents = await db.query.incidents.findMany({
    where: (t, { and: andOp, isNotNull: isNotNullOp, isNull: isNullOp }) =>
      andOp(isNotNullOp(t.description), isNullOp(t.embedding)),
  });

  console.log(`Found ${incidents.length} incidents to embed`);

  for (const incident of incidents) {
    const textToEmbed = [incident.location, incident.description]
      .filter(Boolean)
      .join(" - ");

    if (!textToEmbed) {
      console.log(`Incident ${incident.id}: no text to embed, skipping`);
      continue;
    }

    console.log(
      `Incident ${incident.id}: embedding "${textToEmbed.slice(0, 50)}..."`,
    );

    try {
      const embedding = await generateEmbedding(textToEmbed);

      await client.execute({
        sql: `UPDATE incidents SET embedding = vector32(?) WHERE id = ?`,
        args: [vectorToString(embedding), incident.id],
      });

      console.log(`  Done`);
    } catch (error) {
      console.error(`  Error:`, error);
    }
  }

  console.log("\nDone!");
}

main().catch(console.error);
