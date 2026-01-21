#!/usr/bin/env npx tsx
/**
 * Create Admin User
 *
 * Creates a new admin user with email/password authentication.
 *
 * Usage:
 *   pnpm with-env tsx scripts/create-admin.ts <email> <password> [name]
 *
 * Examples:
 *   pnpm with-env tsx scripts/create-admin.ts admin@example.com secret123
 *   pnpm with-env tsx scripts/create-admin.ts admin@example.com secret123 "John Doe"
 */
import { auth } from "../src/lib/auth";

const email = process.argv[2];
const password = process.argv[3];
const name = process.argv[4] || "Admin";

if (!email || !password) {
  console.log(
    "Usage: npx tsx scripts/create-admin.ts <email> <password> [name]",
  );
  process.exit(1);
}

async function main() {
  try {
    const result = await auth.api.signUpEmail({
      body: {
        email,
        password,
        name,
      },
    });

    console.log("Admin user created:", result.user.email);
  } catch (error) {
    console.error("Failed to create admin user:", error);
    process.exit(1);
  }
}

main();
