import { eq, desc } from "drizzle-orm";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import * as schema from "../../db/schema.js";
import { restaurants } from "../../db/schema.js";
import type {
  CreateRestaurantInput,
  UpdateRestaurantInput,
} from "./validation.js";

export const createRestaurantService = (db: NodePgDatabase<typeof schema>) => {

  const createRestaurant = async (input: CreateRestaurantInput) => {
    const [restaurant] = await db
      .insert(restaurants)
      .values({
        name: input.name,
        address: input.address,
        cuisine: input.cuisine,
      })
      .returning();

    console.log("Restaurant created", { restaurantId: restaurant.id });

    return {
      success: true as const,
      status: 201,
      data: restaurant,
    };
  };

  const listRestaurants = async () => {
    const result = await db.query.restaurants.findMany({
      orderBy: (r, { desc }) => desc(r.createdAt),
    });

    return {
      success: true as const,
      status: 200,
      data: result,
    };
  };

  const getRestaurant = async (id: string) => {
    const restaurant = await db.query.restaurants.findFirst({
      where: (r, { eq }) => eq(r.id, id),
      with: { menuItems: true },
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
    const existing = await db.query.restaurants.findFirst({
      where: (r, { eq }) => eq(r.id, id),
    });

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

    const [restaurant] = await db
      .update(restaurants)
      .set(input)
      .where(eq(restaurants.id, id))
      .returning();

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
