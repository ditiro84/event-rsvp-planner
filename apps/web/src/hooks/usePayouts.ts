import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { CurrencyCode, PaystackBank, PayoutAccountRecord, PayoutProvider } from "@/types";

export function usePayoutAccounts(eventId: string | undefined) {
  return useQuery({
    queryKey: ["events", eventId, "payouts"],
    queryFn: async () => {
      const res = await api.get(`/events/${eventId}/payouts`);
      return res.data.data.payoutAccounts as PayoutAccountRecord[];
    },
    enabled: !!eventId,
  });
}

export function useDisconnectPayoutAccount(eventId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payoutAccountId: string) => {
      await api.delete(`/events/${eventId}/payouts/${payoutAccountId}`);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["events", eventId, "payouts"] }),
  });
}

// Kicks off Stripe Connect Express onboarding -- the caller should redirect
// the browser to the returned onboardingUrl (Stripe's own hosted page)
// rather than rendering anything itself.
export function useConnectStripe(eventId: string) {
  return useMutation({
    mutationFn: async (currency: Extract<CurrencyCode, "USD" | "GBP">) => {
      const res = await api.post(`/events/${eventId}/payouts/stripe/connect`, { currency });
      return res.data.data as { onboardingUrl: string; payoutAccountId: string };
    },
  });
}

// The bank list is static reference data (not really event-specific), but
// the endpoint lives under the event-scoped payouts router -- only fetched
// once the Paystack connect form is actually open (see `enabled`).
export function usePaystackBanks(eventId: string, enabled: boolean) {
  return useQuery({
    queryKey: ["payouts", "paystack", "banks"],
    queryFn: async () => {
      const res = await api.get(`/events/${eventId}/payouts/paystack/banks`);
      return res.data.data.banks as PaystackBank[];
    },
    staleTime: 60 * 60 * 1000, // the bank list barely ever changes
    enabled,
  });
}

export function useConnectPaystack(eventId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { bankCode: string; accountNumber: string }) => {
      const res = await api.post(`/events/${eventId}/payouts/paystack/connect`, input);
      return res.data.data as { payoutAccountId: string; accountName: string };
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["events", eventId, "payouts"] }),
  });
}

export function useConnectPaypal(eventId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { currency: CurrencyCode; email: string }) => {
      const res = await api.post(`/events/${eventId}/payouts/paypal/connect`, input);
      return res.data.data as { payoutAccountId: string };
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["events", eventId, "payouts"] }),
  });
}

export function providerLabel(provider: PayoutProvider) {
  if (provider === "STRIPE_CONNECT") return "Stripe";
  if (provider === "PAYSTACK") return "Paystack";
  return "PayPal";
}
