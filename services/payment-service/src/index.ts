import { loadConfig } from "./config/index.js";
import { initLogger } from "./utils/logger.js";
import { prisma } from "./db/client.js";
import { runMigrations } from "./db/migrate.js";
import { createPaymentService } from "./modules/payment/service.js";
import { createApp } from "./app.js";

const main = async () => {
  const config = loadConfig();
  const logger = initLogger(config.LOG_LEVEL, config.NODE_ENV);

  logger.info(
    {
      nodeEnv: config.NODE_ENV,
      port: config.PORT,
      logLevel: config.LOG_LEVEL,
      successRate: config.PAYMENT_SUCCESS_RATE,
      processingDelayMs: config.PAYMENT_PROCESSING_DELAY_MS,
    },
    "Starting payment-service",
  );

  try {
    await runMigrations();
  } catch (error) {
    logger.error({ err: error }, "Failed to connect to database");
    process.exit(1);
  }

  const paymentService = createPaymentService(
    prisma,
    config.ORDER_SERVICE_URL,
    config.PAYMENT_SUCCESS_RATE,
    config.PAYMENT_PROCESSING_DELAY_MS,
  );

  const app = createApp(logger, paymentService, config.CORS_ORIGIN);

  const server = app.listen(config.PORT, () => {
    logger.info({ port: config.PORT }, "Server is ready");
  });

  const shutdown = async (signal: string) => {
    logger.info({ signal }, "Shutting down gracefully");

    server.close(async () => {
      paymentService.shutdown();
      await prisma.$disconnect();
      logger.info("Server closed");
      process.exit(0);
    });

    setTimeout(() => {
      logger.error("Forced shutdown after timeout");
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
