/**
 * Smoke check for the unified process (API + static SPA).
 * Usage: ECOBOTY_SKIP_BOT=1 node scripts/smoke.js
 * Or against a running server: SMOKE_BASE=http://127.0.0.1:4000 node scripts/smoke.js
 */
import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const base = process.env.SMOKE_BASE || "http://127.0.0.1:4011";
const port = Number(new URL(base).port || 4011);

const external = Boolean(process.env.SMOKE_BASE);
let child = null;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const check = async (urlPath, expectStatus = 200) => {
  const res = await fetch(`${base}${urlPath}`, { redirect: "manual" });
  // SPA / Nuxt may 200 or 301/302 to trailing slash — accept success-ish
  if (res.status !== expectStatus && !(expectStatus === 200 && [200, 301, 302, 304].includes(res.status))) {
    throw new Error(`${urlPath} → ${res.status} (expected ${expectStatus})`);
  }
  return res;
};

try {
  if (!external) {
    child = spawn(
      process.execPath,
      ["apps/server/src/index.js"],
      {
        cwd: root,
        env: {
          ...process.env,
          PORT: String(port),
          BASE_URL: base,
          API_BASE: `http://127.0.0.1:${port}`,
          ECOBOTY_SKIP_BOT: "1",
          NODE_ENV: "development"
        },
        stdio: ["ignore", "pipe", "pipe"]
      }
    );
    let booted = false;
    child.stdout.on("data", (buf) => {
      const text = String(buf);
      if (text.includes("listening")) booted = true;
    });
    child.stderr.on("data", (buf) => process.stderr.write(buf));
    for (let i = 0; i < 40 && !booted; i += 1) await sleep(250);
    if (!booted) throw new Error("server did not boot in time");
  }

  const health = await check("/health");
  const body = await health.json();
  if (!body?.ok) throw new Error("health not ok");

  await check("/");
  await check("/admin-v2");
  await check("/servers");
  // SPA fallback for dynamic route
  await check("/guild/123456789012345678");

  console.log("smoke OK", { base, service: body.service, mode: body.mode });
  process.exitCode = 0;
} catch (error) {
  console.error("smoke FAILED:", error?.message || error);
  process.exitCode = 1;
} finally {
  if (child && !child.killed) {
    child.kill("SIGTERM");
  }
}
