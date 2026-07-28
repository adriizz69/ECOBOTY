import dotenv from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, "../../.env") });
dotenv.config();

const buildDatabaseConnection = () => ({
  uri: process.env.DATABASE_URL,
  timezone: "Z"
});

const setConnectionUtcTimeZone = (connection, done) => {
  connection.query("SET time_zone = '+00:00'", (error) => {
    done(error, connection);
  });
};

export default {
  client: "mysql2",
  connection: buildDatabaseConnection(),
  pool: {
    afterCreate: setConnectionUtcTimeZone
  },
  migrations: {
    directory: "./migrations"
  }
};
