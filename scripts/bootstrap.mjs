import { execFileSync } from "node:child_process";
import { copyFileSync, existsSync, readdirSync } from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const apps = path.join(root, "apps");

for (const app of readdirSync(apps)) {
  const example = path.join(apps, app, ".env.example");
  const env = path.join(apps, app, ".env");

  if (existsSync(example) && !existsSync(env)) {
    copyFileSync(example, env);
    console.log(`  ✓ apps/${app}/.env created from .env.example`);
  }
}

execFileSync("pnpm", ["-F", "@repo/commuting-clawders", "db:push"], {
  cwd: root,
  stdio: "inherit",
});

console.log("  ✓ commuting-clawders' local database is up to date");
