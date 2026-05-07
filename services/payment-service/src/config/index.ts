import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z
    .enum(["development", "testing", "production"])
    .default("development"),
  PORT: z.coerce.number().int().positive().default(3004),
  DATABASE_URL: z.string().url(),
  PAYMENT_SUCCESS_RATE: z.coerce.number().min(0).max(1).default(0.9),
  PAYMENT_PROCESSING_DELAY_MS: z.coerce.number().int().positive().default(2000),
  CORS_ORIGIN: z.string().default("*"),
  LOG_LEVEL: z
    .enum(["trace", "debug", "info", "warn", "error", "fatal"])
    .default("info"),
});

export type EnvConfig = z.infer<typeof envSchema>;

export const loadConfig = (): EnvConfig => {
  const result = envSchema.safeParse(process.env);

  if (!result.success) {
    const issues = result.error.issues.map(
      (issue) => `  - ${issue.path.join(".")}: ${issue.message}`,
    );
    throw new Error(
      `Invalid environment configuration:\n${issues.join("\n")}`,
    );
  }

  return result.data;
};
