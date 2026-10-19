// Copies packages/core/src into supabase/functions/_shared/core so Edge Functions
// (Deno) use exactly the same schemas, limits and prompts as the apps.
// Usage: node scripts/sync-core-to-functions.mjs [--check]
import { cpSync, existsSync, readdirSync, readFileSync, rmSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const src = path.join(root, "packages/core/src");
const dest = path.join(root, "supabase/functions/_shared/core");

function list(dir, base = dir) {
  return readdirSync(dir).flatMap((f) => {
    const p = path.join(dir, f);
    return statSync(p).isDirectory() ? list(p, base) : [path.relative(base, p)];
  });
}

if (process.argv.includes("--check")) {
  const a = list(src).sort();
  const b = existsSync(dest) ? list(dest).sort() : [];
  const stale = a.filter((f) => !b.includes(f) || readFileSync(path.join(src, f), "utf8") !== readFileSync(path.join(dest, f), "utf8"));
  const extra = b.filter((f) => !a.includes(f));
  if (stale.length || extra.length) {
    console.error("supabase/functions/_shared/core is out of date. Run: pnpm sync:functions", { stale, extra });
    process.exit(1);
  }
  console.log("core copy is in sync");
} else {
  rmSync(dest, { recursive: true, force: true });
  cpSync(src, dest, { recursive: true });
  console.log(`Synced ${list(dest).length} files → ${path.relative(root, dest)}`);
}
