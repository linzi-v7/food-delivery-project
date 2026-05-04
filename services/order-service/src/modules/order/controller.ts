import { Request, Response } from "express";
import type { OrderService } from "./service.js";
import {
  createOrderSchema,
  updateOrderStatusSchema,
} from "./validation.js";

export const createOrderController = (orderService: OrderService) => {
  const createOrder = async (req: Request, res: Response): Promise<void> => {
    const result = createOrderSchema.safeParse(req.body);

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

    const outcome = await orderService.createOrder(result.data);
    res.status(outcome.status).json(
      outcome.success
        ? { data: outcome.data }
        : { error: outcome.error }
    );
  };

  const getOrder = async (req: Request, res: Response): Promise<void> => {
    const id = req.params.id as string;
    const outcome = await orderService.getOrder(id);
    res.status(outcome.status).json(
      outcome.success
        ? { data: outcome.data }
        : { error: outcome.error }
    );
  };

  const listCustomerOrders = async (
    req: Request,
    res: Response
  ): Promise<void> => {
    const customerId = req.params.customerId as string;
    const outcome = await orderService.listCustomerOrders(customerId);
    res.status(outcome.status).json({ data: outcome.data });
  };

  const listRestaurantOrders = async (
    req: Request,
    res: Response
  ): Promise<void> => {
    const restaurantId = req.params.restaurantId as string;
    const outcome = await orderService.listRestaurantOrders(restaurantId);
    res.status(outcome.status).json({ data: outcome.data });
  };

  const updateOrderStatus = async (
    req: Request,
    res: Response
  ): Promise<void> => {
    const result = updateOrderStatusSchema.safeParse(req.body);

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

    const id = req.params.id as string;
    const outcome = await orderService.updateOrderStatus(id, result.data);
    res.status(outcome.status).json(
      outcome.success
        ? { data: outcome.data }
        : { error: outcome.error }
    );
  };

  return {
    createOrder,
    getOrder,
    listCustomerOrders,
    listRestaurantOrders,
    updateOrderStatus,
  };
};
