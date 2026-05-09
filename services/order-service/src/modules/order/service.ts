import { eq, desc } from "drizzle-orm";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import jwt from "jsonwebtoken";
import type {
  CreateOrderInput,
  UpdateOrderStatusInput,
} from "./validation.js";
import * as schema from "../../db/schema.js";
import { orders, orderStatusHistory } from "../../db/schema.js";

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
  db: NodePgDatabase<typeof schema>,
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
    const order = await db.query.orders.findFirst({
      where: (orders, { eq }) => eq(orders.id, orderId),
    });
    if (!order) return;
    if (!VALID_TRANSITIONS[order.status]?.includes(newStatus)) return;

    await db.transaction(async (tx) => {
      await tx
        .update(orders)
        .set({ status: newStatus, updatedAt: new Date() })
        .where(eq(orders.id, orderId));
      await tx.insert(orderStatusHistory).values({
        orderId,
        status: newStatus,
        note: note ?? null,
      });
    });

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
    const [order] = await db.transaction(async (tx) => {
      const [newOrder] = await tx
        .insert(orders)
        .values({
          customerId: input.customerId,
          restaurantId: input.restaurantId,
          restaurantName,
          items: enrichedItems,
          totalAmount,
          deliveryAddress: input.deliveryAddress,
          status: initialStatus,
        })
        .returning();

      await tx.insert(orderStatusHistory).values({
        orderId: newOrder.id,
        status: initialStatus,
        note: "Order created",
      });

      const history = await tx.query.orderStatusHistory.findMany({
        where: (h, { eq }) => eq(h.orderId, newOrder.id),
        orderBy: (h, { asc }) => asc(h.createdAt),
      });

      return [{ ...newOrder, statusHistory: history }];
    });

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
    const order = await db.query.orders.findFirst({
      where: (orders, { eq }) => eq(orders.id, id),
      with: { statusHistory: true },
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
    const ordersList = await db.query.orders.findMany({
      where: (orders, { eq }) => eq(orders.customerId, customerId),
      with: { statusHistory: true },
      orderBy: (orders, { desc }) => desc(orders.createdAt),
    });

    return { success: true as const, status: 200, data: ordersList };
  };

  const listRestaurantOrders = async (
    restaurantId: string,
  ) => {
    const ordersList = await db.query.orders.findMany({
      where: (orders, { eq }) => eq(orders.restaurantId, restaurantId),
      with: { statusHistory: true },
      orderBy: (orders, { desc }) => desc(orders.createdAt),
    });

    return { success: true as const, status: 200, data: ordersList };
  };

  const listAllOrders = async () => {
    const ordersList = await db.query.orders.findMany({
      with: { statusHistory: true },
      orderBy: (orders, { desc }) => desc(orders.createdAt),
    });

    return { success: true as const, status: 200, data: ordersList };
  };

  const updateOrderStatus = async (
    id: string,
    input: UpdateOrderStatusInput,
  ) => {
    const order = await db.query.orders.findFirst({
      where: (orders, { eq }) => eq(orders.id, id),
    });

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

    const updatedOrder = await db.transaction(async (tx) => {
      const [updated] = await tx
        .update(orders)
        .set({ status: input.status, updatedAt: new Date() })
        .where(eq(orders.id, id))
        .returning();

      await tx.insert(orderStatusHistory).values({
        orderId: id,
        status: input.status,
        note: input.note ?? null,
      });

      // Fetch fresh status history to return with order
      const history = await tx.query.orderStatusHistory.findMany({
        where: (h, { eq }) => eq(h.orderId, id),
        orderBy: (h, { asc }) => asc(h.createdAt),
      });

      return { ...updated, statusHistory: history };
    });

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
