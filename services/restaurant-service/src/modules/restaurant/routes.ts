import { Router } from "express";
import type { RestaurantService } from "./service.js";
import { createRestaurantController } from "./controller.js";

export const createRestaurantRoutes = (
  restaurantService: RestaurantService
): Router => {
  const router = Router();
  const controller = createRestaurantController(restaurantService);

  router.post("/restaurants", controller.createRestaurant);
  router.get("/restaurants", controller.listRestaurants);
  router.get("/restaurants/:id", controller.getRestaurant);
  router.put("/restaurants/:id", controller.updateRestaurant);

  return router;
};
