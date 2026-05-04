import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z
    .enum(["development", "testing", "production"])
    .default("development"),
  PORT: z.coerce.number().int().positive().default(3003),
  DATABASE_URL: z.string().url(),
  CORS_ORIGIN: z.string().default("*"),
  LOG_LEVEL: z
    .enum(["trace", "debug", "info", "warn", "error", "fatal"])
    .default("info"),
  PAYMENT_SERVICE_URL: z.string().url(),
});

export type EnvConfig = z.infer<typeof envSchema>;

export const loadConfig = (): EnvConfig => {
  const result = envSchema.safeParse(process.env);

  if (!result.success) {
    const issues = result.error.issues.map(
      (issue) => `  - ${issue.path.join(".")}: ${issue.message}`
    );
    throw new Error(
      `Invalid environment configuration:\n${issues.join("\n")}`
    );
  }

  return result.data;
};
