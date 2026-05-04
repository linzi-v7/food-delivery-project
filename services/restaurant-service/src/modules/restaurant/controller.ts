import { Request, Response } from "express";
import type { RestaurantService } from "./service.js";
import {
  createRestaurantSchema,
  updateRestaurantSchema,
} from "./validation.js";

export const createRestaurantController = (
  restaurantService: RestaurantService
) => {
  const createRestaurant = async (
    req: Request,
    res: Response
  ): Promise<void> => {
    const result = createRestaurantSchema.safeParse(req.body);

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

    const outcome = await restaurantService.createRestaurant(result.data);
    res.status(outcome.status).json({ data: outcome.data });
  };

  const listRestaurants = async (
    _req: Request,
    res: Response
  ): Promise<void> => {
    const outcome = await restaurantService.listRestaurants();
    res.status(outcome.status).json({ data: outcome.data });
  };

  const getRestaurant = async (
    req: Request,
    res: Response
  ): Promise<void> => {
    const id = req.params.id as string;
    const outcome = await restaurantService.getRestaurant(id);
    res.status(outcome.status).json(
      outcome.success
        ? { data: outcome.data }
        : { error: outcome.error }
    );
  };

  const updateRestaurant = async (
    req: Request,
    res: Response
  ): Promise<void> => {
    const result = updateRestaurantSchema.safeParse(req.body);

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
    const outcome = await restaurantService.updateRestaurant(
      id,
      result.data
    );
    res.status(outcome.status).json(
      outcome.success
        ? { data: outcome.data }
        : { error: outcome.error }
    );
  };

  return { createRestaurant, listRestaurants, getRestaurant, updateRestaurant };
};
