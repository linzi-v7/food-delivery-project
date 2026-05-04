import { Request, Response, NextFunction } from "express";
import { getLogger } from "../utils/logger.js";

export const requestLogger = (
  req: Request,
  res: Response,
  next: NextFunction,
): void => {
  const start = Date.now();
  const logger = getLogger();

  res.on("finish", () => {
    const duration = Date.now() - start;

    logger.info({
      method: req.method,
      path: req.path,
      status: res.statusCode,
      duration,
      ip: req.ip,
      userAgent: req.get("user-agent"),
    });
  });

  next();
};
