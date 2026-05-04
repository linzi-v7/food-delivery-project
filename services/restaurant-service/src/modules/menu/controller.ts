import { Request, Response } from "express";
import type { MenuService } from "./service.js";
import {
  createMenuItemSchema,
  updateMenuItemSchema,
} from "./validation.js";

export const createMenuController = (menuService: MenuService) => {
  const addMenuItem = async (req: Request, res: Response): Promise<void> => {
    const result = createMenuItemSchema.safeParse(req.body);

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

    const restaurantId = req.params.id as string;
    const outcome = await menuService.addMenuItem(
      restaurantId,
      result.data
    );
    res.status(outcome.status).json(
      outcome.success
        ? { data: outcome.data }
        : { error: outcome.error }
    );
  };

  const getMenuItems = async (
    req: Request,
    res: Response
  ): Promise<void> => {
    const restaurantId = req.params.id as string;
    const outcome = await menuService.getMenuItems(restaurantId);
    res.status(outcome.status).json(
      outcome.success
        ? { data: outcome.data }
        : { error: outcome.error }
    );
  };

  const updateMenuItem = async (
    req: Request,
    res: Response
  ): Promise<void> => {
    const result = updateMenuItemSchema.safeParse(req.body);

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

    const restaurantId = req.params.id as string;
    const itemId = req.params.itemId as string;
    const outcome = await menuService.updateMenuItem(
      restaurantId,
      itemId,
      result.data
    );
    res.status(outcome.status).json(
      outcome.success
        ? { data: outcome.data }
        : { error: outcome.error }
    );
  };

  const deleteMenuItem = async (
    req: Request,
    res: Response
  ): Promise<void> => {
    const restaurantId = req.params.id as string;
    const itemId = req.params.itemId as string;
    const outcome = await menuService.deleteMenuItem(
      restaurantId,
      itemId
    );

    if (outcome.status === 204) {
      res.status(204).end();
      return;
    }

    res.status(outcome.status).json({ error: outcome.error });
  };

  return { addMenuItem, getMenuItems, updateMenuItem, deleteMenuItem };
};
