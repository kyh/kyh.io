#!/usr/bin/env npx tsx
import { embed } from "ai";

const { client, db } = await import("../src/db/drizzle-client");

const generateEmbedding = async (text: string) => {
  const { embedding } = await embed({
    model: "openai/text-embedding-3-small",
    value: text,
  });

  return embedding;
};

const vectorToString = (vector: number[]) => `[${vector.join(",")}]`;

const ensureVectorIndex = async () => {
  try {
    await client.execute(`
      CREATE INDEX IF NOT EXISTS incidents_embedding_idx
      ON incidents(libsql_vector_idx(embedding))
    `);
    console.log("Vector index ready");
  } catch {
    console.log("Note: Vector index creation skipped (may already exist)");
  }
};

const main = async () => {
  await ensureVectorIndex();

  console.log("Finding incidents with descriptions but no embeddings...");

  const incidents = await db.query.incidents.findMany({
    where: { description: { isNotNull: true }, embedding: { isNull: true } },
  });

  console.log(`Found ${incidents.length} incidents to embed`);

  for (const incident of incidents) {
    const textToEmbed = [incident.location, incident.description].filter(Boolean).join(" - ");

    if (!textToEmbed) {
      console.log(`Incident ${incident.id}: no text to embed, skipping`);
      continue;
    }

    console.log(`Incident ${incident.id}: embedding "${textToEmbed.slice(0, 50)}..."`);

    try {
      const embedding = await generateEmbedding(textToEmbed);

      await client.execute({
        args: [vectorToString(embedding), incident.id],
        sql: `UPDATE incidents SET embedding = vector32(?) WHERE id = ?`,
      });

      console.log(`  Done`);
    } catch (error) {
      console.error(`  Error:`, error);
    }
  }

  console.log("\nDone!");
};

try {
  await main();
} catch (error) {
  console.error(error);
}
