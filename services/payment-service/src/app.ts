import express, { Request, Response, NextFunction } from "express";
import helmet from "helmet";
import cors from "cors";
import type { Logger } from "./utils/logger.js";
import type { PaymentService } from "./modules/payment/service.js";
import { requestLogger } from "./middleware/request-logger.js";
import { metricsMiddleware, metricsEndpoint } from "./middleware/metrics.js";
import { createPaymentRoutes } from "./modules/payment/routes.js";

export const createApp = (
  logger: Logger,
  paymentService: PaymentService,
  corsOrigin: string,
) => {
  const app = express();

  // Security headers
  app.use(helmet());

  // CORS
  app.use(
    cors({
      origin: corsOrigin,
      credentials: true,
    }),
  );

  // Body parsing (built into Express 5.x)
  app.use(express.json());

  // Request logging
  app.use(requestLogger);

  // Prometheus metrics
  app.use(metricsMiddleware);

  // Health check
  app.get("/health", (_req: Request, res: Response) => {
    res.status(200).json({
      status: "healthy",
      service: "payment-service",
      timestamp: new Date().toISOString(),
    });
  });

  // Metrics endpoint
  app.get("/metrics", metricsEndpoint);

  // API routes
  app.use(createPaymentRoutes(paymentService));

  // 404 handler
  app.use((_req: Request, res: Response) => {
    res.status(404).json({
      error: {
        code: "NOT_FOUND",
        message: "The requested resource was not found.",
      },
    });
  });

  // Error handler (Express 5: 4-argument signature)
  app.use(
    (err: Error, _req: Request, res: Response, _next: NextFunction) => {
      logger.error({ err });

      res.status(500).json({
        error: {
          code: "INTERNAL_ERROR",
          message:
            process.env.NODE_ENV === "production"
              ? "An unexpected error occurred."
              : err.message,
        },
      });
    },
  );

  return app;
};
