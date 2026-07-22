import { NextFunction, Request, Response } from "express";
import { ZodError } from "zod";
import { AppError } from "../lib/errors";
import { fail } from "../lib/apiResponse";
import { logger } from "../lib/logger";

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function errorHandler(err: unknown, req: Request, res: Response, _next: NextFunction) {
  if (err instanceof ZodError) {
    return fail(res, 400, "VALIDATION_ERROR", "Invalid request data", err.flatten());
  }

  if (err instanceof AppError) {
    if (err.statusCode >= 500) {
      logger.error({ err }, err.message);
    }
    return fail(res, err.statusCode, err.code, err.message, err.details);
  }

  // Prisma unique constraint violation, etc. -- avoid leaking internals to the client.
  logger.error({ err }, "Unhandled error");
  const message =
    process.env.NODE_ENV === "production" ? "An unexpected error occurred" : (err as Error)?.message;
  return fail(res, 500, "INTERNAL_ERROR", message ?? "An unexpected error occurred");
}

export function notFoundHandler(req: Request, res: Response) {
  return fail(res, 404, "NOT_FOUND", `Route not found: ${req.method} ${req.originalUrl}`);
}
