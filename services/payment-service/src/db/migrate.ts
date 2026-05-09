import { prisma } from "./client.js";

export const runMigrations = async (): Promise<void> => {
  try {
    console.log("Connecting to database...");
    await prisma.$connect();
    console.log("Database connected successfully");
  } catch (error) {
    console.error("Failed to connect to database:", error);
    throw error;
  }
};
