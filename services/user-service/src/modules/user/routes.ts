import { Router } from "express";
import type { UserService } from "./service.js";
import { createUserController } from "./controller.js";
import { authenticate, authorize } from "../../middleware/auth.js";

export const createUserRoutes = (userService: UserService): Router => {
  const router = Router();
  const controller = createUserController(userService);

  router.post("/auth/register", controller.register);
  router.post("/auth/login", controller.login);

  router.get("/users", authenticate, authorize("ADMIN"), controller.listUsers);
  router.get("/users/:id", authenticate, controller.getProfile);
  router.put("/users/:id", authenticate, controller.updateProfile);

  return router;
};
