import dotenv from "dotenv";

dotenv.config({ path: "../.env" });
dotenv.config();

export default {
  client: "mysql2",
  connection: process.env.DATABASE_URL,
  migrations: {
    directory: "./migrations"
  }
};
