import { z } from "zod";

export const createOrderSchema = z.object({
  customerId: z.string().min(1, { error: "Customer ID is required" }),
  restaurantId: z.string().min(1, { error: "Restaurant ID is required" }),
  items: z
    .array(
      z.object({
        itemId: z.string().min(1, { error: "Item ID is required" }),
        quantity: z
          .number()
          .int()
          .positive({ error: "Quantity must be a positive integer" }),
      }),
    )
    .min(1, { error: "At least one item is required" }),
  deliveryAddress: z.string().min(1, { error: "Delivery address is required" }),
  transactionId: z.string().optional(),
});

export const updateOrderStatusSchema = z.object({
  status: z.enum(
    [
      "pending",
      "confirmed",
      "preparing",
      "out_for_delivery",
      "delivered",
      "cancelled",
    ],
    { error: "Invalid status value" },
  ),
  note: z.string().optional(),
});

export type CreateOrderInput = z.infer<typeof createOrderSchema>;
export type UpdateOrderStatusInput = z.infer<typeof updateOrderStatusSchema>;
