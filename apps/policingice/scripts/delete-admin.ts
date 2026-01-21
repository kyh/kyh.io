#!/usr/bin/env npx tsx
/**
 * Delete Admin User
 *
 * Deletes a user from the database by email address.
 *
 * Usage:
 *   npx tsx scripts/delete-admin.ts <email>
 *
 * Example:
 *   npx tsx scripts/delete-admin.ts admin@example.com
 */
import "dotenv/config";

import { eq } from "drizzle-orm";

import { db } from "../src/db";
import { user } from "../src/db/schema";

const email = process.argv[2];

if (!email) {
  console.log("Usage: npx tsx scripts/delete-admin.ts <email>");
  process.exit(1);
}

async function main() {
  try {
    const existing = await db.query.user.findFirst({
      where: eq(user.email, email),
    });

    if (!existing) {
      console.log("User not found:", email);
      process.exit(1);
    }

    await db.delete(user).where(eq(user.email, email));
    console.log("User deleted:", email);
  } catch (error) {
    console.error("Failed to delete user:", error);
    process.exit(1);
  }
}

main();
