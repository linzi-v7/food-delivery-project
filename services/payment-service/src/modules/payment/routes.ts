import { Router } from "express";
import type { PaymentService } from "./service.js";
import { createPaymentController } from "./controller.js";

export const createPaymentRoutes = (paymentService: PaymentService): Router => {
  const router = Router();
  const controller = createPaymentController(paymentService);

  router.post("/payments", controller.initiatePayment);

  // Parameterized routes registered after literal routes
  router.get("/payments/order/:orderId", controller.getPaymentByOrder);
  router.get("/payments/:transactionId", controller.getTransaction);
  router.post("/payments/:transactionId/refund", controller.refundTransaction);

  return router;
};
