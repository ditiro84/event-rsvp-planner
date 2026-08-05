import { env } from "../config/env";
import { BadRequestError } from "./errors";

const PAYSTACK_BASE_URL = "https://api.paystack.co";

// Paystack has no official Node SDK we're already depending on, and its API
// is a plain REST/JSON API, so a thin fetch wrapper (Node 20+ has global
// fetch) is simpler than adding a dependency. Same lazy "clear error until
// configured" pattern as getStripeClient()/getResendClient().
export async function paystackRequest<T = unknown>(
  path: string,
  options: { method?: "GET" | "POST"; body?: unknown } = {}
): Promise<T> {
  if (!env.paystackSecretKey) {
    throw new BadRequestError(
      "NGN payouts aren't configured yet. Add PAYSTACK_SECRET_KEY to enable Naira checkout and payouts."
    );
  }

  const res = await fetch(`${PAYSTACK_BASE_URL}${path}`, {
    method: options.method ?? "GET",
    headers: {
      Authorization: `Bearer ${env.paystackSecretKey}`,
      "Content-Type": "application/json",
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  const json = (await res.json()) as { status: boolean; message: string; data: T };
  if (!res.ok || !json.status) {
    throw new BadRequestError(`Paystack error: ${json.message ?? res.statusText}`);
  }
  return json.data;
}
