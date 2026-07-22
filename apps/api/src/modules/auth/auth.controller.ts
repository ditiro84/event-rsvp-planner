import { Request, Response } from "express";
import { env } from "../../config/env";
import { created, ok } from "../../lib/apiResponse";
import { getCurrentUser } from "../../middleware/auth";
import { loginUser, registerUser } from "./auth.service";
import { loginSchema, registerSchema } from "./auth.schema";

const cookieOptions = {
  httpOnly: true,
  secure: env.isProduction,
  sameSite: env.isProduction ? ("none" as const) : ("lax" as const),
  maxAge: 7 * 24 * 60 * 60 * 1000,
  path: "/",
};

export async function register(req: Request, res: Response) {
  const input = registerSchema.parse(req.body);
  const { user, token } = await registerUser(input);
  res.cookie(env.cookieName, token, cookieOptions);
  return created(res, { user, token });
}

export async function login(req: Request, res: Response) {
  const input = loginSchema.parse(req.body);
  const { user, token } = await loginUser(input);
  res.cookie(env.cookieName, token, cookieOptions);
  return ok(res, { user, token });
}

export async function logout(_req: Request, res: Response) {
  res.clearCookie(env.cookieName, { path: "/" });
  return ok(res, { message: "Logged out" });
}

export async function me(req: Request, res: Response) {
  const user = await getCurrentUser(req.userId!);
  return ok(res, { user });
}
