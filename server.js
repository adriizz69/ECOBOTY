import { existsSync } from "node:fs";
import { resolve } from "node:path";

const entry = resolve(process.cwd(), ".output/server/index.mjs");

if (!existsSync(entry)) {
  console.error(`[startup] Missing Nuxt build entry: ${entry}`);
  console.error("[startup] Run `npm run build` in the frontend app root.");
  process.exit(1);
}

await import(entry);
