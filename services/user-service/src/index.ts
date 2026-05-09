import { loadConfig } from "./config/index.js";
import { pool } from "./db/index.js";
import { runMigrations } from "./db/migrate.js";
import { createUserService } from "./modules/user/service.js";
import { createApp } from "./app.js";

const main = async () => {
  const config = loadConfig();

  console.log("Starting user-service", {
    nodeEnv: config.NODE_ENV,
    port: config.PORT,
    logLevel: config.LOG_LEVEL,
  });

  try {
    await runMigrations();
  } catch (error) {
    console.error("Failed to connect to database", error);
    process.exit(1);
  }

  const userService = createUserService(
    config.JWT_SECRET,
    config.JWT_EXPIRES_IN,
    config.BCRYPT_SALT_ROUNDS
  );

  const app = createApp(userService, config.CORS_ORIGIN);

  const server = app.listen(config.PORT, () => {
    console.log("Server is ready", { port: config.PORT });
  });

  const shutdown = async (signal: string) => {
    console.log("Shutting down gracefully", { signal });

    server.close(async () => {
      await pool.end();
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
