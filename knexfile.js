import dotenv from "dotenv";

dotenv.config({ path: "../.env" });
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
