import { Router } from "express";
import type { MenuService } from "./service.js";
import { createMenuController } from "./controller.js";

export const createMenuRoutes = (menuService: MenuService): Router => {
  const router = Router();
  const controller = createMenuController(menuService);

  router.post("/restaurants/:id/menu", controller.addMenuItem);
  router.get("/restaurants/:id/menu", controller.getMenuItems);
  router.put(
    "/restaurants/:id/menu/:itemId",
    controller.updateMenuItem
  );
  router.delete(
    "/restaurants/:id/menu/:itemId",
    controller.deleteMenuItem
  );

  return router;
};
