import { getLogger } from "../utils/logger.js";
import { prisma } from "./client.js";

export const runMigrations = async (): Promise<void> => {
  const logger = getLogger();

  try {
    logger.info("Connecting to database...");
    await prisma.$connect();
    logger.info("Database connected successfully");
  } catch (error) {
    logger.error({ err: error }, "Failed to connect to database");
    throw error;
  }
};
