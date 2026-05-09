import { pool } from "./index.js";

export const runMigrations = async (): Promise<void> => {
  const client = await pool.connect();
  console.log("Database connected successfully");
  client.release();
};
