import { PrismaClient } from "../../generated/client.js";
import jwt from "jsonwebtoken";
import type {
  CreateOrderInput,
  UpdateOrderStatusInput,
} from "./validation.js";

type ServiceResult<T> =
  | { success: true; status: number; data: T }
  | { success: false; status: number; error: { code: string; message: string } };

type FetchResult =
  | { success: true; status: number; data: unknown; durationMs: number }
  | { success: false; error: { code: string; message: string }; durationMs: number };

type MenuItem = {
  id: string;
  name: string;
  price: string | number;
  available: boolean;
};

const VALID_TRANSITIONS: Record<string, string[]> = {
  pending: ["confirmed", "cancelled"],
  confirmed: ["preparing", "cancelled"],
  preparing: ["out_for_delivery", "cancelled"],
  out_for_delivery: ["delivered", "cancelled"],
  delivered: ["cancelled"],
  cancelled: [],
};

export const createOrderService = (
  prisma: PrismaClient,
  userServiceUrl: string,
  restaurantServiceUrl: string,
  paymentServiceUrl: string | undefined,
  jwtSecret: string,
) => {
  const logger = console;

  const generateServiceToken = (): string => {
    return jwt.sign(
      { sub: "order-service", email: "internal@food-delivery.local", role: "admin" },
      jwtSecret,
      { expiresIn: "60s" },
    );
  };

  const callService = async (
    url: string,
    serviceName: string,
    init?: RequestInit,
  ): Promise<FetchResult> => {
    const start = Date.now();
    try {
      const response = await fetch(url, {
        signal: AbortSignal.timeout(5000),
        ...init,
      });
      const durationMs = Date.now() - start;
      const body = await response.json();

      logger.info(
        { svc: serviceName, status: response.status, ms: durationMs },
        "Inter-service call completed",
      );

      return { success: true, status: response.status, data: body, durationMs };
    } catch (error: unknown) {
      const durationMs = Date.now() - start;
      const err = error instanceof Error ? error : new Error(String(error));
      const isTimeout = err.name === "AbortError";

      logger.warn(
        { svc: serviceName, ms: durationMs, timeout: isTimeout, err: err.message },
        "Inter-service call failed",
      );

      return {
        success: false,
        error: { code: "SERVICE_UNREACHABLE", message: `${serviceName} is unreachable` },
        durationMs,
      };
    }
  };

  const advanceStatus = async (
    orderId: string,
    newStatus: string,
    note?: string,
  ): Promise<void> => {
    const order = await prisma.order.findUnique({ where: { id: orderId } });
    if (!order) return;
    if (!VALID_TRANSITIONS[order.status]?.includes(newStatus)) return;

    await prisma.$transaction([
      prisma.order.update({
        where: { id: orderId },
        data: {
          status: newStatus,
          statusHistory: {
            create: { status: newStatus, note: note ?? null },
          },
        },
      }),
    ]);

    logger.info({ orderId, from: order.status, to: newStatus }, "Order status auto-advanced");
  };

  const simulateOrderProgress = async (orderId: string): Promise<void> => {
    const steps: Array<{ status: string; delay: number; note: string }> = [
      { status: "preparing", delay: 3000, note: "Restaurant started preparing your order" },
      { status: "out_for_delivery", delay: 5000, note: "Driver picked up your order" },
      { status: "delivered", delay: 7000, note: "Order delivered successfully" },
    ];

    for (const { status, delay, note } of steps) {
      await new Promise((resolve) => setTimeout(resolve, delay));
      await advanceStatus(orderId, status, note);
    }
  };

  const createOrder = async (
    input: CreateOrderInput,
  ): Promise<ServiceResult<unknown>> => {
    // 1. Validate customer exists
    const authToken = generateServiceToken();
    const userResult = await callService(
      `${userServiceUrl}/users/${input.customerId}`,
      "User Service",
      { headers: { Authorization: `Bearer ${authToken}` } },
    );

    if (!userResult.success) {
      return {
        success: false,
        status: 503,
        error: { code: "SERVICE_UNAVAILABLE", message: "User Service unavailable" },
      };
    }

    if (userResult.status !== 200) {
      return {
        success: false,
        status: 400,
        error: { code: "CUSTOMER_NOT_FOUND", message: "Customer not found" },
      };
    }

    // 2. Verify payment transaction if provided (payment happened before order)
    if (input.transactionId) {
      const txnResult = await callService(
        `${paymentServiceUrl}/payments/${input.transactionId}`,
        "Payment Service",
      );

      if (!txnResult.success) {
        return {
          success: false,
          status: 503,
          error: { code: "SERVICE_UNAVAILABLE", message: "Payment Service unavailable" },
        };
      }

      if (txnResult.status !== 200) {
        return {
          success: false,
          status: 400,
          error: { code: "TRANSACTION_NOT_FOUND", message: "Transaction not found" },
        };
      }

      const txnBody = txnResult.data as { data?: { status?: string } };
      if (txnBody?.data?.status !== "succeeded") {
        return {
          success: false,
          status: 402,
          error: { code: "PAYMENT_FAILED", message: "Payment has not been completed successfully" },
        };
      }

      logger.info({ transactionId: input.transactionId }, "Transaction verified");
    }

    // 3. Validate restaurant exists and get menu items
    const restaurantResult = await callService(
      `${restaurantServiceUrl}/restaurants/${input.restaurantId}`,
      "Restaurant Service",
    );

    if (!restaurantResult.success) {
      return {
        success: false,
        status: 503,
        error: { code: "SERVICE_UNAVAILABLE", message: "Restaurant Service unavailable" },
      };
    }

    if (restaurantResult.status !== 200) {
      return {
        success: false,
        status: 400,
        error: { code: "RESTAURANT_NOT_FOUND", message: "Restaurant not found" },
      };
    }

    // Extract restaurant and menu items from response
    // Restaurant Service returns: { data: { name, ..., menuItems: [...], available: boolean } }
    const restaurantBody = restaurantResult.data as {
      data?: { name?: string; available?: boolean; menuItems?: MenuItem[] };
    };
    const restaurantName = restaurantBody?.data?.name ?? input.restaurantId;
    const menuItems: MenuItem[] = restaurantBody?.data?.menuItems ?? [];
    const menuMap = new Map(menuItems.map((item) => [item.id, item]));

    // 4. Check restaurant availability
    if (restaurantBody?.data?.available === false) {
      return {
        success: false,
        status: 400,
        error: { code: "RESTAURANT_UNAVAILABLE", message: "Restaurant is currently unavailable" },
      };
    }

    // 5. Validate each order item against the menu
    for (const orderItem of input.items) {
      const menuItem = menuMap.get(orderItem.itemId);
      if (!menuItem) {
        return {
          success: false,
          status: 400,
          error: { code: "ITEM_NOT_FOUND", message: `Item ${orderItem.itemId} not found` },
        };
      }
      if (!menuItem.available) {
        return {
          success: false,
          status: 400,
          error: { code: "ITEM_UNAVAILABLE", message: `Item ${orderItem.itemId} is not available` },
        };
      }
    }

    // 6. Enrich items with server-authoritative price and name
    const enrichedItems = input.items.map((orderItem) => {
      const menuItem = menuMap.get(orderItem.itemId)!;
      return {
        itemId: orderItem.itemId,
        quantity: orderItem.quantity,
        name: menuItem.name,
        price: Number(menuItem.price),
      };
    });

    // 7. Calculate total from actual menu prices
    const totalAmount = enrichedItems.reduce(
      (sum, item) => sum + item.quantity * item.price,
      0,
    );

    // 8. Save order — confirmed if payment verified, pending otherwise
    const initialStatus = input.transactionId ? "confirmed" : "pending";
    const [order] = await prisma.$transaction([
      prisma.order.create({
        data: {
          customerId: input.customerId,
          restaurantId: input.restaurantId,
          restaurantName,
          items: enrichedItems,
          totalAmount,
          deliveryAddress: input.deliveryAddress,
          status: initialStatus,
          statusHistory: {
            create: { status: initialStatus, note: "Order created" },
          },
        },
        include: { statusHistory: true },
      }),
    ]);

    logger.info({ orderId: order.id, status: initialStatus }, "Order created");

    // 9. Simulate order progress (confirmed → preparing → out_for_delivery → delivered)
    if (input.transactionId) {
      void simulateOrderProgress(order.id);
    }

    return { success: true, status: 201, data: order };
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

  const listAllOrders = async () => {
    const orders = await prisma.order.findMany({
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
    listAllOrders,
    updateOrderStatus,
  };
};

export type OrderService = ReturnType<typeof createOrderService>;
