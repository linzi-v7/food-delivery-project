import { z } from "zod";

export const initiatePaymentSchema = z.object({
  orderId: z.string().min(1, { error: "Order ID is required" }),
  customerId: z.string().optional(),
  amount: z.number().positive({ error: "Amount must be a positive number" }),
});

export type InitiatePaymentInput = z.infer<typeof initiatePaymentSchema>;
