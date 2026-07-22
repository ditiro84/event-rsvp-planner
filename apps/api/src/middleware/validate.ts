import { NextFunction, Request, Response } from "express";
import { AnyZodObject, ZodEffects } from "zod";

type Schema = AnyZodObject | ZodEffects<AnyZodObject>;

// Validates and replaces req.body/query/params with the parsed (typed, coerced) result.
export function validateBody(schema: Schema) {
  return (req: Request, _res: Response, next: NextFunction) => {
    req.body = schema.parse(req.body);
    next();
  };
}

export function validateQuery(schema: Schema) {
  return (req: Request, _res: Response, next: NextFunction) => {
    req.query = schema.parse(req.query) as unknown as Request["query"];
    next();
  };
}

export function validateParams(schema: Schema) {
  return (req: Request, _res: Response, next: NextFunction) => {
    req.params = schema.parse(req.params) as unknown as Request["params"];
    next();
  };
}
