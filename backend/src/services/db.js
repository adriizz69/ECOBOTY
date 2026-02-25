import net from "node:net";
import knex from "knex";

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

export const db = knex({
  client: "mysql2",
  connection: buildDatabaseConnection(),
  pool: {
    afterCreate: setConnectionUtcTimeZone
  }
});
