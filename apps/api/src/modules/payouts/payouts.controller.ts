import { Request, Response } from "express";
import { noContent, ok } from "../../lib/apiResponse";
import { connectPaypalSchema, connectPaystackSchema, connectStripeSchema } from "./payouts.schema";
import * as service from "./payouts.service";

export async function list(req: Request, res: Response) {
  const payoutAccounts = await service.listPayoutAccounts(req.userId!, req.params.eventId);
  return ok(res, { payoutAccounts });
}

export async function remove(req: Request, res: Response) {
  await service.disconnectPayoutAccount(req.userId!, req.params.eventId, req.params.payoutAccountId);
  return noContent(res);
}

export async function connectStripe(req: Request, res: Response) {
  const input = connectStripeSchema.parse(req.body);
  const result = await service.connectStripe(req.userId!, req.params.eventId, input);
  return ok(res, result);
}

export async function listPaystackBanks(_req: Request, res: Response) {
  const banks = await service.listNigerianBanks();
  return ok(res, { banks });
}

export async function connectPaystack(req: Request, res: Response) {
  const input = connectPaystackSchema.parse(req.body);
  const result = await service.connectPaystack(req.userId!, req.params.eventId, input);
  return ok(res, result);
}

export async function connectPaypal(req: Request, res: Response) {
  const input = connectPaypalSchema.parse(req.body);
  const result = await service.connectPaypal(req.userId!, req.params.eventId, input);
  return ok(res, result);
}
