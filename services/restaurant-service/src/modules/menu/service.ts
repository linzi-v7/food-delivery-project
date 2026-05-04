import { PrismaClient } from "../../generated/client.js";
import { getLogger } from "../../utils/logger.js";
import type {
  CreateMenuItemInput,
  UpdateMenuItemInput,
} from "./validation.js";

export const createMenuService = (prisma: PrismaClient) => {
  const logger = getLogger();

  const addMenuItem = async (
    restaurantId: string,
    input: CreateMenuItemInput
  ) => {
    const restaurant = await prisma.restaurant.findUnique({
      where: { id: restaurantId },
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

    const menuItem = await prisma.menuItem.create({
      data: {
        name: input.name,
        description: input.description,
        price: input.price,
        available: input.available,
        restaurantId,
      },
    });

    logger.info(
      { menuItemId: menuItem.id, restaurantId },
      "Menu item added"
    );

    return {
      success: true as const,
      status: 201,
      data: menuItem,
    };
  };

  const getMenuItems = async (restaurantId: string) => {
    const restaurant = await prisma.restaurant.findUnique({
      where: { id: restaurantId },
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

    const menuItems = await prisma.menuItem.findMany({
      where: { restaurantId },
      orderBy: { createdAt: "desc" },
    });

    return {
      success: true as const,
      status: 200,
      data: menuItems,
    };
  };

  const updateMenuItem = async (
    restaurantId: string,
    itemId: string,
    input: UpdateMenuItemInput
  ) => {
    const menuItem = await prisma.menuItem.findFirst({
      where: { id: itemId, restaurantId },
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

    const updated = await prisma.menuItem.update({
      where: { id: itemId },
      data: input,
    });

    logger.info({ menuItemId: itemId }, "Menu item updated");

    return {
      success: true as const,
      status: 200,
      data: updated,
    };
  };

  const deleteMenuItem = async (restaurantId: string, itemId: string) => {
    const menuItem = await prisma.menuItem.findFirst({
      where: { id: itemId, restaurantId },
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

    await prisma.menuItem.delete({ where: { id: itemId } });

    logger.info({ menuItemId: itemId, restaurantId }, "Menu item deleted");

    return {
      success: true as const,
      status: 204,
      data: null,
    };
  };

  return { addMenuItem, getMenuItems, updateMenuItem, deleteMenuItem };
};

export type MenuService = ReturnType<typeof createMenuService>;
