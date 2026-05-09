import { PrismaClient } from "../../generated/client.js";
import type {
  CreateRestaurantInput,
  UpdateRestaurantInput,
} from "./validation.js";

export const createRestaurantService = (prisma: PrismaClient) => {

  const createRestaurant = async (input: CreateRestaurantInput) => {
    const restaurant = await prisma.restaurant.create({
      data: {
        name: input.name,
        address: input.address,
        cuisine: input.cuisine,
      },
    });

    console.log("Restaurant created", { restaurantId: restaurant.id });

    return {
      success: true as const,
      status: 201,
      data: restaurant,
    };
  };

  const listRestaurants = async () => {
    const restaurants = await prisma.restaurant.findMany({
      orderBy: { createdAt: "desc" },
    });

    return {
      success: true as const,
      status: 200,
      data: restaurants,
    };
  };

  const getRestaurant = async (id: string) => {
    const restaurant = await prisma.restaurant.findUnique({
      where: { id },
      include: { menuItems: true },
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

    return {
      success: true as const,
      status: 200,
      data: restaurant,
    };
  };

  const updateRestaurant = async (id: string, input: UpdateRestaurantInput) => {
    const existing = await prisma.restaurant.findUnique({ where: { id } });

    if (!existing) {
      return {
        success: false as const,
        status: 404,
        error: {
          code: "NOT_FOUND",
          message: "Restaurant not found.",
        },
      };
    }

    const restaurant = await prisma.restaurant.update({
      where: { id },
      data: input,
    });

    console.log("Restaurant updated", { restaurantId: id });

    return {
      success: true as const,
      status: 200,
      data: restaurant,
    };
  };

  return { createRestaurant, listRestaurants, getRestaurant, updateRestaurant };
};

export type RestaurantService = ReturnType<typeof createRestaurantService>;
