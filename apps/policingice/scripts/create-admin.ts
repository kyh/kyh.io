#!/usr/bin/env npx tsx
import { auth } from "../src/lib/auth";

const [email, password, nameArg] = process.argv.slice(2);
const name = nameArg || "Admin";

if (!email || !password) {
  console.log("Usage: npx tsx scripts/create-admin.ts <email> <password> [name]");
  process.exit(1);
}

const main = async () => {
  try {
    const result = await auth.api.signUpEmail({
      body: {
        email,
        name,
        password,
      },
    });

    console.log("Admin user created:", result.user.email);
  } catch (error) {
    console.error("Failed to create admin user:", error);
    process.exit(1);
  }
};

void main();
