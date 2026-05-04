import { PrismaClient } from "../../generated/client.js";
import { getLogger } from "../../utils/logger.js";
import type {
  CreateOrderInput,
  UpdateOrderStatusInput,
} from "./validation.js";

type ServiceResult<T> =
  | { success: true; status: number; data: T }
  | { success: false; status: number; error: { code: string; message: string } };

const VALID_TRANSITIONS: Record<string, string[]> = {
  pending: ["confirmed", "cancelled"],
  confirmed: ["preparing", "cancelled"],
  preparing: ["out_for_delivery", "cancelled"],
  out_for_delivery: ["delivered", "cancelled"],
  delivered: ["cancelled"],
  cancelled: [],
};

export const createOrderService = (prisma: PrismaClient) => {
  const logger = getLogger();

  const createOrder = async (
    input: CreateOrderInput,
  ) => {
    const totalAmount = input.items.reduce(
      (sum, item) => sum + item.quantity * item.price,
      0,
    );

    const [order] = await prisma.$transaction([
      prisma.order.create({
        data: {
          customerId: input.customerId,
          restaurantId: input.restaurantId,
          items: input.items,
          totalAmount,
          deliveryAddress: input.deliveryAddress,
          status: "pending",
          statusHistory: {
            create: { status: "pending", note: "Order created" },
          },
        },
        include: { statusHistory: true },
      }),
    ]);

    logger.info({ orderId: order.id }, "Order created");

    const paymentServiceUrl = process.env.PAYMENT_SERVICE_URL;
    if (paymentServiceUrl) {
      try {
        await fetch(`${paymentServiceUrl}/payments`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            orderId: order.id,
            amount: Number(order.totalAmount),
          }),
        });
      } catch {
        logger.warn(
          { orderId: order.id },
          "Payment service unreachable, order created without payment",
        );
      }
    } else {
      logger.debug("PAYMENT_SERVICE_URL not set, skipping payment call");
    }

    return { success: true as const, status: 201, data: order };
  };

  const getOrder = async (
    id: string,
  ) => {
    const order = await prisma.order.findUnique({
      where: { id },
      include: { statusHistory: true },
    });

    if (!order) {
      return {
        success: false as const,
        status: 404,
        error: { code: "NOT_FOUND", message: "Order not found." },
      };
    }

    return { success: true as const, status: 200, data: order };
  };

  const listCustomerOrders = async (
    customerId: string,
  ) => {
    const orders = await prisma.order.findMany({
      where: { customerId },
      include: { statusHistory: true },
      orderBy: { createdAt: "desc" },
    });

    return { success: true as const, status: 200, data: orders };
  };

  const listRestaurantOrders = async (
    restaurantId: string,
  ) => {
    const orders = await prisma.order.findMany({
      where: { restaurantId },
      include: { statusHistory: true },
      orderBy: { createdAt: "desc" },
    });

    return { success: true as const, status: 200, data: orders };
  };

  const updateOrderStatus = async (
    id: string,
    input: UpdateOrderStatusInput,
  ) => {
    const order = await prisma.order.findUnique({ where: { id } });

    if (!order) {
      return {
        success: false as const,
        status: 404,
        error: { code: "NOT_FOUND", message: "Order not found." },
      };
    }

    if (!VALID_TRANSITIONS[order.status]?.includes(input.status)) {
      return {
        success: false as const,
        status: 422,
        error: {
          code: "INVALID_TRANSITION",
          message: `Cannot transition from ${order.status} to ${input.status}.`,
        },
      };
    }

    const [updatedOrder] = await prisma.$transaction([
      prisma.order.update({
        where: { id },
        data: {
          status: input.status,
          statusHistory: {
            create: {
              status: input.status,
              note: input.note ?? null,
            },
          },
        },
        include: { statusHistory: true },
      }),
    ]);

    logger.info(
      { orderId: id, from: order.status, to: input.status },
      "Order status updated",
    );

    return { success: true as const, status: 200, data: updatedOrder };
  };

  return {
    createOrder,
    getOrder,
    listCustomerOrders,
    listRestaurantOrders,
    updateOrderStatus,
  };
};

export type OrderService = ReturnType<typeof createOrderService>;
