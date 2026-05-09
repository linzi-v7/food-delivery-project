import express, { Request, Response, NextFunction } from "express";
import helmet from "helmet";
import cors from "cors";
import type { OrderService } from "./modules/order/service.js";
import { createOrderRoutes } from "./modules/order/routes.js";

export const createApp = (
  orderService: OrderService,
  corsOrigin: string
) => {
  const app = express();

  app.use(helmet());

  app.use(
    cors({
      origin: corsOrigin,
      credentials: true,
    })
  );

  app.use(express.json());

  app.get("/health", (_req: Request, res: Response) => {
    res.status(200).json({
      status: "healthy",
      service: "order-service",
      timestamp: new Date().toISOString(),
    });
  });

  app.use(createOrderRoutes(orderService));

  app.use((_req: Request, res: Response) => {
    res.status(404).json({
      error: {
        code: "NOT_FOUND",
        message: "The requested resource was not found.",
      },
    });
  });

  app.use(
    (err: Error, _req: Request, res: Response, _next: NextFunction) => {
      console.error(err);

      res.status(500).json({
        error: {
          code: "INTERNAL_ERROR",
          message:
            process.env.NODE_ENV === "production"
              ? "An unexpected error occurred."
              : err.message,
        },
      });
    }
  );

  return app;
};
