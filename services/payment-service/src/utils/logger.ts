import pino from "pino";

const createLogger = (logLevel: string, nodeEnv: string) =>
  pino({
    name: "payment-service",
    level: logLevel,
    timestamp: pino.stdTimeFunctions.isoTime,
    formatters: {
      level(label) {
        return { severity: label.toUpperCase(), level: label };
      },
      bindings(bindings) {
        return {
          pid: bindings.pid,
          host: bindings.hostname,
          environment: nodeEnv,
          service: "payment-service",
        };
      },
    },
  });

let loggerInstance: pino.Logger | null = null;

export const initLogger = (logLevel: string, nodeEnv: string): pino.Logger => {
  loggerInstance = createLogger(logLevel, nodeEnv);
  return loggerInstance;
};

export const getLogger = (): pino.Logger => {
  if (!loggerInstance) {
    loggerInstance = createLogger("info", "development");
  }
  return loggerInstance;
};

export type Logger = pino.Logger;
