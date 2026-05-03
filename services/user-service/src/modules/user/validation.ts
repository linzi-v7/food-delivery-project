import { z } from "zod";

export const registerSchema = z.object({
  name: z.string().min(1).max(100),
  email: z.email(),
  password: z
    .string()
    .min(8)
    .max(128)
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, {
      error: "Password must contain at least one uppercase letter, one lowercase letter, and one number",
    }),
  role: z.enum(["CUSTOMER", "DELIVERY_PERSONNEL"]),
});

export const loginSchema = z.object({
  email: z.email(),
  password: z.string().min(1),
});

export const updateProfileSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  email: z.email().optional(),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
