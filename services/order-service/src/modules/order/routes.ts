import { Router } from "express";
import type { OrderService } from "./service.js";
import { createOrderController } from "./controller.js";

export const createOrderRoutes = (orderService: OrderService): Router => {
  const router = Router();
  const controller = createOrderController(orderService);

  router.post("/orders", controller.createOrder);

  // Parameterized collection routes MUST be registered before /orders/:id
  // to prevent Express from matching "customer" and "restaurant" as :id values.
  router.get("/orders/customer/:customerId", controller.listCustomerOrders);
  router.get(
    "/orders/restaurant/:restaurantId",
    controller.listRestaurantOrders,
  );

  router.get("/orders/:id", controller.getOrder);
  router.put("/orders/:id/status", controller.updateOrderStatus);

  return router;
};
