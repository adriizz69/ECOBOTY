import { spawnSync } from "node:child_process";
import fs from "node:fs";
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

if (result.status !== 0) {
  process.exit(result.status ?? 1);
}

const srcPublic = path.join(root, "apps/web/.output/public");
const destPublic = path.join(root, ".output/public");
const destServerDir = path.join(root, ".output/server");
const destServerEntry = path.join(destServerDir, "index.mjs");

if (!fs.existsSync(path.join(srcPublic, "index.html"))) {
  console.error("[build] Missing apps/web/.output/public/index.html");
  process.exit(1);
}

fs.rmSync(destPublic, { recursive: true, force: true });
fs.cpSync(srcPublic, destPublic, { recursive: true });

fs.mkdirSync(destServerDir, { recursive: true });
fs.writeFileSync(
  destServerEntry,
  [
    "// Plesk startup — unified EcoBoty server (Express + Discord bot + SPA)",
    "import \"../../apps/server/src/index.js\";",
    ""
  ].join("\n"),
  "utf8"
);

console.log(`[build] Synced ${destPublic}`);
console.log(`[build] Plesk startup wrapper: ${destServerEntry}`);
process.exit(0);