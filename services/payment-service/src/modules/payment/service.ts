import { PrismaClient } from "../../generated/client.js";
import { getLogger } from "../../utils/logger.js";
import { paymentSuccessRate } from "../../middleware/metrics.js";
import type { InitiatePaymentInput } from "./validation.js";

export const createPaymentService = (
  prisma: PrismaClient,
  successRate: number,
  processingDelayMs: number,
) => {
  const logger = getLogger();

  const processAndFinalize = async (
    transactionId: string,
  ): Promise<"succeeded" | "failed"> => {
    const isSuccess = Math.random() < successRate;
    const status = isSuccess ? "succeeded" : "failed";

    // Simulate processing delay
    await new Promise((resolve) => setTimeout(resolve, processingDelayMs));

    await prisma.transaction.update({
      where: { transactionId },
      data: { status },
    });

    logger.info({ transactionId, status }, "Payment processed");
    return status;
  };

  const updateSuccessRateMetric = async (): Promise<void> => {
    try {
      const [total, succeeded] = await Promise.all([
        prisma.transaction.count(),
        prisma.transaction.count({
          where: { status: { in: ["succeeded", "refunded"] } },
        }),
      ]);
      if (total > 0) paymentSuccessRate.set(succeeded / total);
    } catch {
      // silently ignore metric update failures
    }
  };

  const initiatePayment = async (input: InitiatePaymentInput) => {
    // Create transaction as pending
    const transaction = await prisma.transaction.create({
      data: {
        orderId: input.orderId ?? null,
        customerId: input.customerId ?? null,
        amount: input.amount,
        status: "pending",
      },
    });

    logger.info(
      { transactionId: transaction.transactionId, amount: input.amount },
      "Payment initiated",
    );

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
    const transaction = await prisma.transaction.findUnique({
      where: { transactionId },
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
    const transaction = await prisma.transaction.findFirst({
      where: { orderId },
      orderBy: { createdAt: "desc" },
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
    const transaction = await prisma.transaction.findUnique({
      where: { transactionId },
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

    const updated = await prisma.transaction.update({
      where: { transactionId },
      data: { status: "refunded" },
    });

    logger.info({ transactionId }, "Transaction refunded");

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

  // Update success rate metric periodically
  const metricInterval = setInterval(updateSuccessRateMetric, 30000);
  updateSuccessRateMetric();

  return {
    initiatePayment,
    getTransaction,
    getPaymentByOrder,
    refundTransaction,
    shutdown: () => clearInterval(metricInterval),
  };
};

export type PaymentService = ReturnType<typeof createPaymentService>;
