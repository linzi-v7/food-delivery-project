import { Router } from "express";
import type { RestaurantService } from "./service.js";
import { createRestaurantController } from "./controller.js";
import { authenticate, authorize } from "../../middleware/auth.js";

export const createRestaurantRoutes = (
  restaurantService: RestaurantService
): Router => {
  const router = Router();
  const controller = createRestaurantController(restaurantService);

  router.get("/restaurants", controller.listRestaurants);
  router.get("/restaurants/:id", controller.getRestaurant);
  router.post(
    "/restaurants",
    authenticate,
    authorize("ADMIN"),
    controller.createRestaurant,
  );
  router.put(
    "/restaurants/:id",
    authenticate,
    authorize("ADMIN"),
    controller.updateRestaurant,
  );

  return router;
};
