import { eq, desc } from "drizzle-orm";
import { db } from "../../db/index.js";
import { transactions } from "../../db/schema.js";
import type { InitiatePaymentInput } from "./validation.js";

export const createPaymentService = (
  successRate: number,
  processingDelayMs: number,
) => {
  const processAndFinalize = async (
    transactionId: string,
  ): Promise<"succeeded" | "failed"> => {
    const isSuccess = Math.random() < successRate;
    const status = isSuccess ? "succeeded" : "failed";

    // Simulate processing delay
    await new Promise((resolve) => setTimeout(resolve, processingDelayMs));

    await db
      .update(transactions)
      .set({ status })
      .where(eq(transactions.transactionId, transactionId));

    console.log("Payment processed", { transactionId, status });
    return status;
  };

  const initiatePayment = async (input: InitiatePaymentInput) => {
    // Create transaction as pending
    const [transaction] = await db
      .insert(transactions)
      .values({
        orderId: input.orderId ?? null,
        customerId: input.customerId ?? null,
        amount: input.amount,
        status: "pending",
      })
      .returning();

    console.log("Payment initiated", { transactionId: transaction.transactionId, amount: input.amount });

    // Process synchronously — caller waits for the result
    const finalStatus = await processAndFinalize(transaction.transactionId);

    return {
      success: true as const,
      status: finalStatus === "succeeded" ? 201 : 402,
      data: {
        transactionId: transaction.transactionId,
        orderId: transaction.orderId,
        customerId: transaction.customerId,
        amount: transaction.amount,
        status: finalStatus,
        createdAt: transaction.createdAt,
      },
    };
  };

  const getTransaction = async (transactionId: string) => {
    const transaction = await db.query.transactions.findFirst({
      where: (t, { eq }) => eq(t.transactionId, transactionId),
    });

    if (!transaction) {
      return {
        success: false as const,
        status: 404,
        error: { code: "TRANSACTION_NOT_FOUND", message: "Transaction not found." },
      };
    }

    return {
      success: true as const,
      status: 200,
      data: {
        transactionId: transaction.transactionId,
        orderId: transaction.orderId,
        customerId: transaction.customerId,
        amount: transaction.amount,
        status: transaction.status,
        createdAt: transaction.createdAt,
        updatedAt: transaction.updatedAt,
      },
    };
  };

  const getPaymentByOrder = async (orderId: string) => {
    const transaction = await db.query.transactions.findFirst({
      where: (t, { eq }) => eq(t.orderId, orderId),
      orderBy: (t, { desc }) => desc(t.createdAt),
    });

    if (!transaction) {
      return {
        success: false as const,
        status: 404,
        error: { code: "PAYMENT_NOT_FOUND", message: "No payment record found for this order." },
      };
    }

    return {
      success: true as const,
      status: 200,
      data: {
        transactionId: transaction.transactionId,
        orderId: transaction.orderId,
        customerId: transaction.customerId,
        amount: transaction.amount,
        status: transaction.status,
        createdAt: transaction.createdAt,
        updatedAt: transaction.updatedAt,
      },
    };
  };

  const refundTransaction = async (transactionId: string) => {
    const transaction = await db.query.transactions.findFirst({
      where: (t, { eq }) => eq(t.transactionId, transactionId),
    });

    if (!transaction) {
      return {
        success: false as const,
        status: 404,
        error: { code: "TRANSACTION_NOT_FOUND", message: "Transaction not found." },
      };
    }

    if (transaction.status !== "succeeded") {
      return {
        success: false as const,
        status: 422,
        error: {
          code: "INVALID_REFUND",
          message: `Cannot refund a transaction with status "${transaction.status}". Only succeeded transactions can be refunded.`,
        },
      };
    }

    const [updated] = await db
      .update(transactions)
      .set({ status: "refunded" })
      .where(eq(transactions.transactionId, transactionId))
      .returning();

    console.log("Transaction refunded", { transactionId });

    return {
      success: true as const,
      status: 200,
      data: {
        transactionId: updated.transactionId,
        orderId: updated.orderId,
        customerId: updated.customerId,
        amount: updated.amount,
        status: updated.status,
        createdAt: updated.createdAt,
        updatedAt: updated.updatedAt,
      },
    };
  };

  return {
    initiatePayment,
    getTransaction,
    getPaymentByOrder,
    refundTransaction,
  };
};

export type PaymentService = ReturnType<typeof createPaymentService>;
