import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { eq } from "drizzle-orm";
import { db } from "../../db/index.js";
import { users } from "../../db/schema.js";
import type {
  RegisterInput,
  LoginInput,
  UpdateProfileInput,
} from "./validation.js";

export const createUserService = (
  jwtSecret: string,
  jwtExpiresIn: string,
  saltRounds: number
) => {
  const register = async (input: RegisterInput) => {
    const existing = await db.query.users.findFirst({
      where: (users, { eq }) => eq(users.email, input.email),
    });

    if (existing) {
      return {
        success: false as const,
        status: 409,
        error: {
          code: "EMAIL_EXISTS",
          message: "A user with this email already exists.",
        },
      };
    }

    const passwordHash = await bcrypt.hash(input.password, saltRounds);

    const [user] = await db
      .insert(users)
      .values({
        name: input.name,
        email: input.email,
        passwordHash,
        role: input.role,
      })
      .returning();

    const token = jwt.sign(
      { sub: user.id, email: user.email, role: user.role },
      jwtSecret,
      { expiresIn: jwtExpiresIn } as jwt.SignOptions
    );

    console.log("User registered", { userId: user.id, email: user.email });

    return {
      success: true as const,
      status: 201,
      data: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        createdAt: user.createdAt,
        token,
      },
    };
  };

  const login = async (input: LoginInput) => {
    const user = await db.query.users.findFirst({
      where: (users, { eq }) => eq(users.email, input.email),
    });

    if (!user) {
      return {
        success: false as const,
        status: 401,
        error: {
          code: "INVALID_CREDENTIALS",
          message: "Invalid email or password.",
        },
      };
    }

    const isValid = await bcrypt.compare(input.password, user.passwordHash);

    if (!isValid) {
      return {
        success: false as const,
        status: 401,
        error: {
          code: "INVALID_CREDENTIALS",
          message: "Invalid email or password.",
        },
      };
    }

    const token = jwt.sign(
      { sub: user.id, email: user.email, role: user.role },
      jwtSecret,
      { expiresIn: jwtExpiresIn } as jwt.SignOptions
    );

    console.log("User logged in", { userId: user.id });

    return {
      success: true as const,
      status: 200,
      data: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        createdAt: user.createdAt,
        token,
      },
    };
  };

  const getProfile = async (userId: string) => {
    const user = await db.query.users.findFirst({
      where: (users, { eq }) => eq(users.id, userId),
      columns: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      return {
        success: false as const,
        status: 404,
        error: {
          code: "USER_NOT_FOUND",
          message: "User not found.",
        },
      };
    }

    return {
      success: true as const,
      status: 200,
      data: user,
    };
  };

  const listUsers = async () => {
    const usersList = await db.query.users.findMany({
      columns: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: (users, { desc }) => desc(users.createdAt),
    });

    return {
      success: true as const,
      status: 200,
      data: usersList,
    };
  };

  const updateProfile = async (
    userId: string,
    requesterId: string,
    requesterRole: string,
    input: UpdateProfileInput
  ) => {
    if (userId !== requesterId && requesterRole !== "CUSTOMER") {
      return {
        success: false as const,
        status: 403,
        error: {
          code: "FORBIDDEN",
          message: "You can only update your own profile.",
        },
      };
    }

    if (input.email) {
      const email = input.email;
      const existing = await db.query.users.findFirst({
        where: (users, { eq, and, ne }) =>
          and(eq(users.email, email), ne(users.id, userId)),
      });

      if (existing) {
        return {
          success: false as const,
          status: 409,
          error: {
            code: "EMAIL_EXISTS",
            message: "This email is already in use by another user.",
          },
        };
      }
    }

    const [user] = await db
      .update(users)
      .set(input)
      .where(eq(users.id, userId))
      .returning();

    console.log("User profile updated", { userId });

    return {
      success: true as const,
      status: 200,
      data: user,
    };
  };

  return { register, login, getProfile, listUsers, updateProfile };
};

export type UserService = ReturnType<typeof createUserService>;
