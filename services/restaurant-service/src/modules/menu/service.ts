import { eq, desc, and } from "drizzle-orm";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import * as schema from "../../db/schema.js";
import { restaurants, menuItems } from "../../db/schema.js";
import type {
  CreateMenuItemInput,
  UpdateMenuItemInput,
} from "./validation.js";

export const createMenuService = (db: NodePgDatabase<typeof schema>) => {

  const addMenuItem = async (
    restaurantId: string,
    input: CreateMenuItemInput
  ) => {
    const restaurant = await db.query.restaurants.findFirst({
      where: (r, { eq }) => eq(r.id, restaurantId),
    });

    if (!restaurant) {
      return {
        success: false as const,
        status: 404,
        error: {
          code: "NOT_FOUND",
          message: "Restaurant not found.",
        },
      };
    }

    const [menuItem] = await db
      .insert(menuItems)
      .values({
        name: input.name,
        description: input.description,
        price: input.price,
        available: input.available,
        restaurantId,
      })
      .returning();

    console.log("Menu item added", { menuItemId: menuItem.id, restaurantId });

    return {
      success: true as const,
      status: 201,
      data: menuItem,
    };
  };

  const getMenuItems = async (restaurantId: string) => {
    const restaurant = await db.query.restaurants.findFirst({
      where: (r, { eq }) => eq(r.id, restaurantId),
    });

    if (!restaurant) {
      return {
        success: false as const,
        status: 404,
        error: {
          code: "NOT_FOUND",
          message: "Restaurant not found.",
        },
      };
    }

    const items = await db.query.menuItems.findMany({
      where: (m, { eq }) => eq(m.restaurantId, restaurantId),
      orderBy: (m, { desc }) => desc(m.createdAt),
    });

    return {
      success: true as const,
      status: 200,
      data: items,
    };
  };

  const updateMenuItem = async (
    restaurantId: string,
    itemId: string,
    input: UpdateMenuItemInput
  ) => {
    const menuItem = await db.query.menuItems.findFirst({
      where: (m, { eq }) =>
        and(eq(m.id, itemId), eq(m.restaurantId, restaurantId)),
    });

    if (!menuItem) {
      return {
        success: false as const,
        status: 404,
        error: {
          code: "NOT_FOUND",
          message: "Menu item not found for this restaurant.",
        },
      };
    }

    const [updated] = await db
      .update(menuItems)
      .set(input)
      .where(eq(menuItems.id, itemId))
      .returning();

    console.log("Menu item updated", { menuItemId: itemId });

    return {
      success: true as const,
      status: 200,
      data: updated,
    };
  };

  const deleteMenuItem = async (restaurantId: string, itemId: string) => {
    const menuItem = await db.query.menuItems.findFirst({
      where: (m, { eq }) =>
        and(eq(m.id, itemId), eq(m.restaurantId, restaurantId)),
    });

    if (!menuItem) {
      return {
        success: false as const,
        status: 404,
        error: {
          code: "NOT_FOUND",
          message: "Menu item not found for this restaurant.",
        },
      };
    }

    await db.delete(menuItems).where(eq(menuItems.id, itemId));

    console.log("Menu item deleted", { menuItemId: itemId, restaurantId });

    return {
      success: true as const,
      status: 204,
      data: null,
    };
  };

  return { addMenuItem, getMenuItems, updateMenuItem, deleteMenuItem };
};

export type MenuService = ReturnType<typeof createMenuService>;
