import { useMutation, useQuery } from "@tanstack/react-query";
import { api, apiBaseUrl } from "@/lib/api";
import type { PayoutProvider, PublicTicketEventListing, PublicTicketOrder } from "@/types";

export function usePublicTicketEvent(slug: string | undefined) {
  return useQuery({
    queryKey: ["tickets", "event", slug],
    queryFn: async () => {
      const res = await api.get(`/tickets/events/${slug}`);
      return res.data.data as PublicTicketEventListing;
    },
    enabled: !!slug,
  });
}

export function publicTicketEventCoverImageUrl(slug: string) {
  return `${apiBaseUrl}/tickets/events/${slug}/cover-image`;
}

export function useTicketCheckout(slug: string) {
  return useMutation({
    mutationFn: async (input: {
      buyerName: string;
      buyerEmail: string;
      items: { ticketTypeId: string; quantity: number }[];
      provider?: PayoutProvider;
    }) => {
      const res = await api.post(`/tickets/events/${slug}/checkout`, input);
      return res.data.data as { checkoutUrl: string };
    },
  });
}

// Called once the guest approves payment on PayPal's site and lands back on
// the public ticket page with PayPal's own ?token=<paypalOrderId> query
// param (see checkout.service.ts captureTicketPaypalCheckout).
export function useCaptureTicketPaypal(slug: string) {
  return useMutation({
    mutationFn: async (paypalOrderId: string) => {
      const res = await api.post(`/tickets/events/${slug}/checkout/paypal/capture`, { paypalOrderId });
      return res.data.data as { order: { id: string } };
    },
  });
}

// Ticket codes/status for a completed order -- polled on the confirmation
// screen once the guest lands back with ?orderId= (see PublicTicketEventPage).
export function usePublicTicketOrder(orderId: string | undefined) {
  return useQuery({
    queryKey: ["tickets", "order", orderId],
    queryFn: async () => {
      const res = await api.get(`/tickets/orders/${orderId}`);
      return res.data.data.order as PublicTicketOrder;
    },
    enabled: !!orderId,
    // PAID status can lag a beat behind the redirect if the webhook hasn't
    // landed yet -- poll briefly rather than making the guest refresh.
    refetchInterval: (query) => (query.state.data?.status === "PENDING" ? 2000 : false),
  });
}
