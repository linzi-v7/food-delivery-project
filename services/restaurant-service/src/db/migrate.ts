import { pool } from "./index.js";

export const runMigrations = async (): Promise<void> => {
  try {
    console.log("Connecting to database...");
    const client = await pool.connect();
    client.release();
    console.log("Database connected successfully");
  } catch (error) {
    console.error("Failed to connect to database:", error);
    throw error;
  }
};
