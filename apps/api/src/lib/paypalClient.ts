import { env } from "../config/env";
import { BadRequestError } from "./errors";

const PAYPAL_BASE_URL = env.paypalMode === "live" ? "https://api-m.paypal.com" : "https://api-m.sandbox.paypal.com";

function requirePaypalConfigured() {
  if (!env.paypalClientId || !env.paypalClientSecret) {
    throw new BadRequestError(
      "PayPal isn't configured yet. Add PAYPAL_CLIENT_ID and PAYPAL_CLIENT_SECRET to enable it as a checkout option."
    );
  }
}

// Client-credentials tokens are short-lived (a few hours) -- cached in
// memory and refreshed a minute before expiry rather than fetched on every
// checkout. Same lazy-until-configured pattern as getStripeClient().
let cachedToken: { value: string; expiresAt: number } | null = null;

async function getAccessToken(): Promise<string> {
  requirePaypalConfigured();
  if (cachedToken && cachedToken.expiresAt > Date.now()) return cachedToken.value;

  const res = await fetch(`${PAYPAL_BASE_URL}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(`${env.paypalClientId}:${env.paypalClientSecret}`).toString("base64")}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });
  const json = (await res.json()) as { access_token?: string; expires_in?: number; error_description?: string };
  if (!res.ok || !json.access_token) {
    throw new BadRequestError(`PayPal authentication failed: ${json.error_description ?? res.statusText}`);
  }

  cachedToken = { value: json.access_token, expiresAt: Date.now() + (json.expires_in ?? 3000) * 1000 - 60_000 };
  return cachedToken.value;
}

async function paypalRequest<T = unknown>(path: string, options: { method?: "GET" | "POST"; body?: unknown } = {}) {
  const token = await getAccessToken();
  const res = await fetch(`${PAYPAL_BASE_URL}${path}`, {
    method: options.method ?? "GET",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
  });
  const json = (await res.json()) as T & { message?: string; details?: unknown };
  if (!res.ok) {
    throw new BadRequestError(`PayPal error: ${(json as { message?: string }).message ?? res.statusText}`, json);
  }
  return json;
}

export interface CreatePaypalOrderParams {
  amount: number; // whole-currency units, e.g. dollars -- PayPal's API wants a decimal string, not cents.
  currency: "USD" | "GBP" | "NGN";
  payeeEmail: string;
  platformFeeAmount: number; // same whole-currency units; 0 disables the fee attempt entirely.
  orderId: string; // our internal Order.id, round-tripped via custom_id for the webhook/capture step to match back
  returnUrl: string; // where PayPal redirects after the guest approves -- our frontend calls capturePaypalCheckout from here
  cancelUrl: string;
}

// Creates a PayPal order routed to the planner's own PayPal account via
// payee.email_address -- no Stripe-Connect-style approval needed for this.
// Attempting payment_instruction.platform_fees (our cut) DOES require
// PayPal Partner/BN-code enrollment we don't have yet; if PayPal rejects the
// request because of that, we retry once without the fee so checkout still
// works -- the planner just gets 100% for that order instead of us silently
// failing the whole purchase. feeApplied on the return value tells the
// caller (orders.service.ts) which happened, so it can record platformFeeCents accurately.
export async function createPaypalOrder(params: CreatePaypalOrderParams) {
  const amountValue = params.amount.toFixed(2);

  const buildPurchaseUnit = (withFee: boolean) => ({
    custom_id: params.orderId,
    amount: { currency_code: params.currency, value: amountValue },
    payee: { email_address: params.payeeEmail },
    ...(withFee && params.platformFeeAmount > 0
      ? {
          payment_instruction: {
            disbursement_mode: "INSTANT",
            platform_fees: [
              { payments: { platform_fee: { currency_code: params.currency, value: params.platformFeeAmount.toFixed(2) } } },
            ],
          },
        }
      : {}),
  });

  const create = (withFee: boolean) =>
    paypalRequest<{ id: string; links: { rel: string; href: string }[] }>("/v2/checkout/orders", {
      method: "POST",
      body: {
        intent: "CAPTURE",
        purchase_units: [buildPurchaseUnit(withFee)],
        application_context: {
          return_url: params.returnUrl,
          cancel_url: params.cancelUrl,
          shipping_preference: "NO_SHIPPING",
          user_action: "PAY_NOW",
          brand_name: "EventFlow",
        },
      },
    });

  try {
    if (params.platformFeeAmount > 0) {
      const order = await create(true);
      return { ...order, feeApplied: true };
    }
    const order = await create(false);
    return { ...order, feeApplied: false };
  } catch {
    // Most likely cause: platform_fees requires Partner/BN-code enrollment
    // we don't have. Fall back to a fee-less order rather than blocking the
    // guest's purchase entirely.
    const order = await create(false);
    return { ...order, feeApplied: false };
  }
}

export async function capturePaypalOrder(paypalOrderId: string) {
  return paypalRequest<{
    id: string;
    status: string;
    purchase_units: { payments: { captures: { id: string; status: string }[] } }[];
  }>(`/v2/checkout/orders/${paypalOrderId}/capture`, { method: "POST" });
}
