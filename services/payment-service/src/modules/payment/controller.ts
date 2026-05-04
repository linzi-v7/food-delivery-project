import { Request, Response } from "express";
import type { PaymentService } from "./service.js";
import { initiatePaymentSchema } from "./validation.js";

export const createPaymentController = (paymentService: PaymentService) => {
  const initiatePayment = async (
    req: Request,
    res: Response,
  ): Promise<void> => {
    const result = initiatePaymentSchema.safeParse(req.body);

    if (!result.success) {
      res.status(400).json({
        error: {
          code: "VALIDATION_ERROR",
          message: "Invalid request data.",
          details: result.error.issues.map((issue) => ({
            field: issue.path.join("."),
            message: issue.message,
          })),
        },
      });
      return;
    }

    const outcome = await paymentService.initiatePayment(result.data);
    res.status(outcome.status).json({ data: outcome.data });
  };

  const getTransaction = async (
    req: Request,
    res: Response,
  ): Promise<void> => {
    const transactionId = req.params.transactionId as string;
    const outcome = await paymentService.getTransaction(transactionId);

    res.status(outcome.status).json(
      outcome.success
        ? { data: outcome.data }
        : { error: outcome.error },
    );
  };

  const getPaymentByOrder = async (
    req: Request,
    res: Response,
  ): Promise<void> => {
    const orderId = req.params.orderId as string;
    const outcome = await paymentService.getPaymentByOrder(orderId);

    res.status(outcome.status).json(
      outcome.success
        ? { data: outcome.data }
        : { error: outcome.error },
    );
  };

  const refundTransaction = async (
    req: Request,
    res: Response,
  ): Promise<void> => {
    const transactionId = req.params.transactionId as string;
    const outcome = await paymentService.refundTransaction(transactionId);

    res.status(outcome.status).json(
      outcome.success
        ? { data: outcome.data }
        : { error: outcome.error },
    );
  };

  return { initiatePayment, getTransaction, getPaymentByOrder, refundTransaction };
};
