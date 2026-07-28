import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);

let knexCli;
try {
  knexCli = require.resolve("knex/bin/cli.js");
} catch {
  knexCli = require.resolve("knex/bin/cli.js", {
    paths: [path.resolve(__dirname, "../../node_modules")]
  });
}

const result = spawnSync(
  process.execPath,
  [knexCli, "migrate:latest", "--knexfile", path.join(__dirname, "knexfile.js")],
  {
    cwd: __dirname,
    env: process.env,
    stdio: "inherit"
  }
);

process.exit(result.status ?? 1);
