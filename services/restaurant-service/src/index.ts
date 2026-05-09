import { loadConfig } from "./config/index.js";
import { prisma } from "./db/client.js";
import { runMigrations } from "./db/migrate.js";
import { runSeed } from "./db/seed.js";
import { createRestaurantService } from "./modules/restaurant/service.js";
import { createMenuService } from "./modules/menu/service.js";
import { createApp } from "./app.js";

const main = async () => {
  const config = loadConfig();

  console.log("Starting restaurant-service", {
    nodeEnv: config.NODE_ENV,
    port: config.PORT,
    logLevel: config.LOG_LEVEL,
  });

  try {
    await runMigrations();
    await runSeed(prisma);
  } catch (error) {
    console.error("Failed to connect to database:", error);
    process.exit(1);
  }

  const restaurantService = createRestaurantService(prisma);
  const menuService = createMenuService(prisma);

  const app = createApp(
    restaurantService,
    menuService,
    config.CORS_ORIGIN
  );

  const server = app.listen(config.PORT, () => {
    console.log("Server is ready on port", config.PORT);
  });

  const shutdown = async (signal: string) => {
    console.log("Shutting down gracefully, signal:", signal);

    server.close(async () => {
      await prisma.$disconnect();
      console.log("Server closed");
      process.exit(0);
    });

    setTimeout(() => {
      console.error("Forced shutdown after timeout");
      process.exit(1);
    }, 10000).unref();
  };

  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT", () => shutdown("SIGINT"));
};

main().catch((error) => {
  console.error("Fatal startup error:", error);
  process.exit(1);
});
