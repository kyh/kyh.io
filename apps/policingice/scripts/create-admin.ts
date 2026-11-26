#!/usr/bin/env npx tsx
import { auth } from "../src/lib/auth";

const [email, nameArg] = process.argv.slice(2);
const name = nameArg || "Admin";

if (!email) {
  console.log("Usage: npx tsx scripts/create-admin.ts <email> [name]");
  process.exit(1);
}

const main = async () => {
  try {
    const context = await auth.$context;

    const created = await context.internalAdapter.createUser(
      { email, emailVerified: true, name },
      { method: "admin" },
    );

    console.log(
      "Admin user created:",
      created.email,
      "— they sign in at /admin/login with a mailed code.",
    );
  } catch (error) {
    console.error("Failed to create admin user:", error);
    process.exit(1);
  }
};

void main();
