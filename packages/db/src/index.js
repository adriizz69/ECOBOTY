import net from "node:net";
import path from "node:path";
import { fileURLToPath } from "node:url";
import knex from "knex";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const migrationsDir = path.join(__dirname, "../migrations");
const DEFAULT_DB_PORT = 3306;
const DEFAULT_DB_TIMEOUT_MS = 2000;

const parseDatabaseTarget = () => {
  const raw = String(process.env.DATABASE_URL || "").trim();
  if (!raw) return null;
  try {
    const url = new URL(raw);
    const port = Number(url.port || DEFAULT_DB_PORT);
    if (!url.hostname || !Number.isFinite(port) || port <= 0) return null;
    return { host: url.hostname, port };
  } catch {
    return null;
  }
};

export const probeDatabaseConnection = async (timeoutMs = DEFAULT_DB_TIMEOUT_MS) => {
  const target = parseDatabaseTarget();
  if (!target) {
    return {
      ok: false,
      code: "DB_URL_INVALID",
      message: "DATABASE_URL missing or invalid"
    };
  }

  const ms = Math.max(250, Number(timeoutMs || DEFAULT_DB_TIMEOUT_MS));

  return new Promise((resolve) => {
    const socket = new net.Socket();
    let settled = false;

    const done = (result) => {
      if (settled) return;
      settled = true;
      socket.destroy();
      resolve(result);
    };

    socket.setTimeout(ms);
    socket.once("connect", () => {
      done({ ok: true, code: "OK", message: "Database host reachable" });
    });
    socket.once("timeout", () => {
      done({
        ok: false,
        code: "DB_TIMEOUT",
        message: `Database connect timeout after ${ms}ms`
      });
    });
    socket.once("error", (error) => {
      done({
        ok: false,
        code: error?.code || "DB_TCP_ERROR",
        message: error?.message || "Database TCP error"
      });
    });

    socket.connect(target.port, target.host);
  });
};

const buildDatabaseConnection = () => ({
  uri: process.env.DATABASE_URL,
  timezone: "Z"
});

const setConnectionUtcTimeZone = (connection, done) => {
  connection.query("SET time_zone = '+00:00'", (error) => {
    done(error, connection);
  });
};

export const createDb = () =>
  knex({
    client: "mysql2",
    connection: buildDatabaseConnection(),
    pool: {
      afterCreate: setConnectionUtcTimeZone
    }
  });

export const runMigrations = async () => {
  const databaseUrl = String(process.env.DATABASE_URL || "").trim();
  if (!databaseUrl) {
    const error = new Error("DATABASE_URL missing");
    error.code = "DATABASE_URL_MISSING";
    throw error;
  }

  const migrationDb = knex({
    client: "mysql2",
    connection: buildDatabaseConnection(),
    pool: {
      afterCreate: setConnectionUtcTimeZone
    },
    migrations: {
      directory: migrationsDir
    }
  });

  try {
    const [batch, log] = await migrationDb.migrate.latest();
    if (log.length) {
      console.log(`[db] migrations applied (batch ${batch}): ${log.join(", ")}`);
    } else {
      console.log("[db] migrations up to date");
    }
    return { ok: true, batch, log };
  } finally {
    await migrationDb.destroy();
  }
};

export const db = createDb();
export default db;
