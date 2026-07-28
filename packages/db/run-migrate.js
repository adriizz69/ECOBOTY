import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import dotenv from "dotenv";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);

// Local: .env at repo root. Plesk: variables Node.js injectées au `npm start` (prestart).
dotenv.config({ path: path.resolve(__dirname, "../../.env") });
dotenv.config();

const databaseUrl = String(process.env.DATABASE_URL || "").trim();
if (!databaseUrl) {
  console.error(
    [
      "",
      "[ecoboty/db] DATABASE_URL manquant.",
      "",
      "Local : créer un fichier .env à la racine du repo.",
      "Plesk : les variables Node.js du panel ne sont pas exportées dans un terminal SSH.",
      "  → Utiliser « Restart app » / npm start : les migrations tournent via prestart.",
      "  → Ou : export DATABASE_URL='mysql://...' puis npm run migrate",
      ""
    ].join("\n")
  );
  process.exit(1);
}

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
