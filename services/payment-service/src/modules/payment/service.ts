import { PrismaClient } from "../../generated/client.js";
import { getLogger } from "../../utils/logger.js";
import { paymentSuccessRate } from "../../middleware/metrics.js";
import type { InitiatePaymentInput } from "./validation.js";

export const createPaymentService = (
  prisma: PrismaClient,
  orderServiceUrl: string | undefined,
  successRate: number,
  processingDelayMs: number,
) => {
  const logger = getLogger();

  const notifyOrderService = async (
    orderId: string,
    status: "confirmed" | "cancelled",
  ): Promise<void> => {
    if (!orderServiceUrl) {
      logger.debug({ orderId, status }, "ORDER_SERVICE_URL not set, skipping callback");
      return;
    }

    try {
      const response = await fetch(
        `${orderServiceUrl}/orders/${orderId}/status`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status }),
          signal: AbortSignal.timeout(5000),
        },
      );

      if (!response.ok) {
        logger.warn(
          { orderId, status, responseStatus: response.status },
          "Order service callback returned non-200 status",
        );
      } else {
        logger.info(
          { orderId, status },
          "Order service notified successfully",
        );
      }
    } catch (error) {
      logger.warn(
        { err: error, orderId, status },
        "Order service callback failed (unreachable)",
      );
    }
  };

  const processPayment = async (transactionId: string): Promise<void> => {
    const isSuccess = Math.random() < successRate;
    const newStatus = isSuccess ? "succeeded" : "failed";
    const orderStatus = isSuccess ? "confirmed" : "cancelled";

    await new Promise((resolve) => setTimeout(resolve, processingDelayMs));

    try {
      const updated = await prisma.transaction.update({
        where: { transactionId },
        data: { status: newStatus },
      });

      logger.info(
        { transactionId, status: newStatus, orderId: updated.orderId },
        "Payment processed",
      );

      void notifyOrderService(updated.orderId, orderStatus);
    } catch (error) {
      logger.error(
        { err: error, transactionId },
        "Failed to update transaction status",
      );
    }
  };

  const updateSuccessRateMetric = async (): Promise<void> => {
    try {
      const [total, succeeded] = await Promise.all([
        prisma.transaction.count(),
        prisma.transaction.count({
          where: { status: { in: ["succeeded", "refunded"] } },
        }),
      ]);

      if (total > 0) {
        paymentSuccessRate.set(succeeded / total);
      }
    } catch {
      // silently ignore metric update failures
    }
  };

  const validateOrder = async (
    orderId: string,
  ): Promise<{ valid: boolean; error?: { code: string; message: string } }> => {
    if (!orderServiceUrl) {
      logger.debug("ORDER_SERVICE_URL not set, skipping order validation");
      return { valid: true };
    }

    const start = Date.now();
    try {
      const response = await fetch(`${orderServiceUrl}/orders/${orderId}`, {
        signal: AbortSignal.timeout(5000),
      });
      const durationMs = Date.now() - start;

      logger.info(
        { svc: "Order Service", status: response.status, ms: durationMs },
        "Order validation call completed",
      );

      if (!response.ok) {
        return {
          valid: false,
          error: { code: "ORDER_NOT_FOUND", message: "Order not found" },
        };
      }

      return { valid: true };
    } catch (error: unknown) {
      const durationMs = Date.now() - start;
      const err = error instanceof Error ? error : new Error(String(error));
      const isTimeout = err.name === "AbortError";

      logger.warn(
        { svc: "Order Service", ms: durationMs, timeout: isTimeout, err: err.message },
        "Order validation call failed",
      );

      return {
        valid: false,
        error: { code: "SERVICE_UNAVAILABLE", message: "Order Service unavailable" },
      };
    }
  };

  const initiatePayment = async (input: InitiatePaymentInput) => {
    // 1. Validate order exists
    const orderCheck = await validateOrder(input.orderId);

    if (!orderCheck.valid) {
      if (orderCheck.error?.code === "SERVICE_UNAVAILABLE") {
        return {
          success: false as const,
          status: 503,
          error: { code: "SERVICE_UNAVAILABLE", message: "Order Service unavailable" },
        };
      }
      return {
        success: false as const,
        status: 400,
        error: { code: "ORDER_NOT_FOUND", message: "Order not found" },
      };
    }

    // 2. Prevent double charging — check for existing succeeded transaction
    const existingSucceeded = await prisma.transaction.findFirst({
      where: { orderId: input.orderId, status: "succeeded" },
    });

    if (existingSucceeded) {
      return {
        success: false as const,
        status: 409,
        error: {
          code: "ALREADY_PAID",
          message: "Payment has already been processed for this order",
        },
      };
    }

    const transaction = await prisma.transaction.create({
      data: {
        orderId: input.orderId,
        customerId: input.customerId ?? null,
        amount: input.amount,
        status: "pending",
      },
    });

    logger.info(
      { transactionId: transaction.transactionId, orderId: input.orderId },
      "Payment initiated",
    );

    // Fire-and-forget async processing
    void processPayment(transaction.transactionId);

    return {
      success: true as const,
      status: 201,
      data: {
        transactionId: transaction.transactionId,
        orderId: transaction.orderId,
        customerId: transaction.customerId,
        amount: transaction.amount,
        status: transaction.status,
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
        error: {
          code: "TRANSACTION_NOT_FOUND",
          message: "Transaction not found.",
        },
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
        error: {
          code: "PAYMENT_NOT_FOUND",
          message: "No payment record found for this order.",
        },
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
        error: {
          code: "TRANSACTION_NOT_FOUND",
          message: "Transaction not found.",
        },
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
