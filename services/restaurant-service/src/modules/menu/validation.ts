import { z } from "zod";

export const createMenuItemSchema = z.object({
  name: z.string().min(1, { error: "Name is required" }).max(100),
  description: z.string().min(1, { error: "Description is required" }).max(500),
  price: z.number().positive({ error: "Price must be positive" }).max(99999.99),
  available: z.boolean().default(true),
});

export const updateMenuItemSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().min(1).max(500).optional(),
  price: z.number().positive().max(99999.99).optional(),
  available: z.boolean().optional(),
});

export type CreateMenuItemInput = z.infer<typeof createMenuItemSchema>;
export type UpdateMenuItemInput = z.infer<typeof updateMenuItemSchema>;
