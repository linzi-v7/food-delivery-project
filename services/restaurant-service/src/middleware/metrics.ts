import { Request, Response, NextFunction } from "express";
import {
  Counter,
  Histogram,
  Registry,
  collectDefaultMetrics,
} from "prom-client";

const register = new Registry();
collectDefaultMetrics({ register, prefix: "restaurant_service_" });

const httpRequestsTotal = new Counter({
  name: "restaurant_service_http_requests_total",
  help: "Total number of HTTP requests",
  labelNames: ["method", "route", "status_code"],
  registers: [register],
});

const httpRequestDurationSeconds = new Histogram({
  name: "restaurant_service_http_request_duration_seconds",
  help: "HTTP request duration in seconds",
  labelNames: ["method", "route", "status_code"],
  buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10],
  registers: [register],
});

const normalizeRoute = (path: string): string => {
  return path.replace(/\/\d+/g, "/:id");
};

export const metricsMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const end = httpRequestDurationSeconds.startTimer();

  res.on("finish", () => {
    const route = normalizeRoute(req.path);
    const labels = {
      method: req.method,
      route,
      status_code: String(res.statusCode),
    };

    httpRequestsTotal.inc(labels);
    end(labels);
  });

  next();
};

export const metricsEndpoint = async (
  _req: Request,
  res: Response
): Promise<void> => {
  res.set("Content-Type", register.contentType);
  res.end(await register.metrics());
};
