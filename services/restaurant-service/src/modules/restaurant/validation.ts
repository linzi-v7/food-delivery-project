import { z } from "zod";

export const createRestaurantSchema = z.object({
  name: z.string().min(1, { error: "Name is required" }).max(100),
  address: z.string().min(1, { error: "Address is required" }).max(200),
  cuisine: z.string().min(1, { error: "Cuisine type is required" }).max(100),
  available: z.boolean().optional(),
});

export const updateRestaurantSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  address: z.string().min(1).max(200).optional(),
  cuisine: z.string().min(1).max(100).optional(),
  available: z.boolean().optional(),
});

export type CreateRestaurantInput = z.infer<typeof createRestaurantSchema>;
export type UpdateRestaurantInput = z.infer<typeof updateRestaurantSchema>;
