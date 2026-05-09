import { Request, Response } from "express";
import type { UserService } from "./service.js";
import {
  registerSchema,
  loginSchema,
  updateProfileSchema,
} from "./validation.js";

export const createUserController = (userService: UserService) => {
  const register = async (req: Request, res: Response): Promise<void> => {
    const result = registerSchema.safeParse(req.body);

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

    const outcome = await userService.register(result.data);
    res.status(outcome.status).json(
      outcome.success
        ? { data: outcome.data }
        : { error: outcome.error }
    );
  };

  const login = async (req: Request, res: Response): Promise<void> => {
    const result = loginSchema.safeParse(req.body);

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

    const outcome = await userService.login(result.data);
    res.status(outcome.status).json(
      outcome.success
        ? { data: outcome.data }
        : { error: outcome.error }
    );
  };

  const getProfile = async (req: Request, res: Response): Promise<void> => {
    const id = req.params.id as string;
    const outcome = await userService.getProfile(id);

    res.status(outcome.status).json(
      outcome.success
        ? { data: outcome.data }
        : { error: outcome.error }
    );
  };

  const listUsers = async (_req: Request, res: Response): Promise<void> => {
    const outcome = await userService.listUsers();
    res.status(outcome.status).json({ data: outcome.data });
  };

  const updateProfile = async (req: Request, res: Response): Promise<void> => {
    const id = req.params.id as string;
    const result = updateProfileSchema.safeParse(req.body);

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

    const requester = req.user!;
    const outcome = await userService.updateProfile(
      id,
      requester.sub,
      requester.role,
      result.data
    );

    res.status(outcome.status).json(
      outcome.success
        ? { data: outcome.data }
        : { error: outcome.error }
    );
  };

  return { register, login, getProfile, listUsers, updateProfile };
};
