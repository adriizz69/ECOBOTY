import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
dotenv.config({ path: path.join(root, ".env") });

const env = {
  ...process.env,
  NODE_ENV: "production",
  NUXT_BUILD_TARGET: "production",
  // Force same-origin SPA for deploy artifacts
  API_BASE: ""
};

console.log("[build] Generating Nuxt SPA (API_BASE empty = same-origin)…");
const result = spawnSync("npm", ["run", "build", "-w", "@ecoboty/web"], {
  cwd: root,
  env,
  stdio: "inherit",
  shell: true
});

process.exit(result.status ?? 1);
