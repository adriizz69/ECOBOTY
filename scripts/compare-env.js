import fs from "node:fs";

const parseEnv = (file) => {
  const out = {};
  if (!fs.existsSync(file)) return out;
  const text = fs.readFileSync(file, "utf8");
  for (const line of text.split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const i = t.indexOf("=");
    if (i < 0) continue;
    const k = t.slice(0, i).trim();
    let v = t.slice(i + 1);
    if (
      (v.startsWith('"') && v.endsWith('"')) ||
      (v.startsWith("'") && v.endsWith("'"))
    ) {
      v = v.slice(1, -1);
    }
    out[k] = v;
  }
  return out;
};

const mask = (k, v) => {
  if (v === undefined) return "MISSING";
  if (!/TOKEN|SECRET|PASSWORD|DATABASE_URL|KEY/i.test(k)) return JSON.stringify(v);
  if (!v) return "EMPTY";
  if (k === "DATABASE_URL") {
    try {
      const u = new URL(v);
      return `mysql://${u.username}:***@${u.hostname}:${u.port || 3306}${u.pathname}`;
    } catch {
      return "SET(invalid)";
    }
  }
  return `SET(len=${v.length})`;
};

const files = [".env", ".env.example", "apps/web/.env", "legacy/frontend/.env"];
const all = {};

for (const f of files) {
  all[f] = parseEnv(f);
  console.log(`\n== ${f} (${Object.keys(all[f]).length} keys)`);
  for (const [k, v] of Object.entries(all[f])) {
    console.log(`  ${k}=${mask(k, v)}`);
  }
}

const root = all[".env"];
const web = all["apps/web/.env"];
const legacyWeb = all["legacy/frontend/.env"];
const keys = new Set([...Object.keys(root), ...Object.keys(web), ...Object.keys(legacyWeb)]);

console.log("\n== DIFF root | apps/web | legacy/frontend");
for (const k of [...keys].sort()) {
  const a = root[k];
  const b = web[k];
  const c = legacyWeb[k];
  if (a === b && (c === undefined || a === c)) continue;
  console.log(`${k}: root=${mask(k, a)} | web=${mask(k, b)} | legacyFront=${mask(k, c)}`);
}
