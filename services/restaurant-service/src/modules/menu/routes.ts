import { Router } from "express";
import type { MenuService } from "./service.js";
import { createMenuController } from "./controller.js";
import { authenticate, authorize } from "../../middleware/auth.js";

export const createMenuRoutes = (menuService: MenuService): Router => {
  const router = Router();
  const controller = createMenuController(menuService);

  router.post(
    "/restaurants/:id/menu",
    authenticate,
    authorize("ADMIN"),
    controller.addMenuItem,
  );
  router.get("/restaurants/:id/menu", controller.getMenuItems);
  router.put(
    "/restaurants/:id/menu/:itemId",
    authenticate,
    authorize("ADMIN"),
    controller.updateMenuItem,
  );
  router.delete(
    "/restaurants/:id/menu/:itemId",
    authenticate,
    authorize("ADMIN"),
    controller.deleteMenuItem,
  );

  return router;
};
