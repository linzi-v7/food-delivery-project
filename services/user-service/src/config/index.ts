import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z
    .enum(["development", "testing", "production"])
    .default("development"),
  PORT: z.coerce.number().int().positive().default(3001),
  DATABASE_URL: z.string().url(),
  JWT_SECRET: z.string().min(32),
  JWT_EXPIRES_IN: z.string().default("1h"),
  BCRYPT_SALT_ROUNDS: z.coerce.number().int().positive().default(10),
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
      (issue) => `  - ${issue.path.join(".")}: ${issue.message}`
    );
    throw new Error(
      `Invalid environment configuration:\n${issues.join("\n")}`
    );
  }

  return result.data;
};
