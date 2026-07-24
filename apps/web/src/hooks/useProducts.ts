import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, apiBaseUrl } from "@/lib/api";
import type { OrderRecord, OrdersSummary, ProductRecord, PublicShopListing } from "@/types";

export function useProducts(eventId: string | undefined) {
  return useQuery({
    queryKey: ["events", eventId, "products"],
    queryFn: async () => {
      const res = await api.get(`/events/${eventId}/products`);
      return res.data.data.products as ProductRecord[];
    },
    enabled: !!eventId,
  });
}

export function useCreateProduct(eventId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: Record<string, unknown>) => {
      const res = await api.post(`/events/${eventId}/products`, input);
      return res.data.data.product as ProductRecord;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["events", eventId, "products"] }),
  });
}

export function useUpdateProduct(eventId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ productId, input }: { productId: string; input: Record<string, unknown> }) => {
      const res = await api.put(`/events/${eventId}/products/${productId}`, input);
      return res.data.data.product as ProductRecord;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["events", eventId, "products"] }),
  });
}

export function useDeleteProduct(eventId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (productId: string) => {
      await api.delete(`/events/${eventId}/products/${productId}`);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["events", eventId, "products"] }),
  });
}

export function useUploadProductImage(eventId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ productId, file }: { productId: string; file: File }) => {
      const formData = new FormData();
      formData.append("file", file);
      const res = await api.post(`/events/${eventId}/products/${productId}/image`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      return res.data.data.product as ProductRecord;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["events", eventId, "products"] }),
  });
}

export function productImageUrl(eventId: string, productId: string) {
  return `${apiBaseUrl}/events/${eventId}/products/${productId}/image`;
}

export function publicProductImageUrl(productId: string) {
  return `${apiBaseUrl}/shop/products/${productId}/image`;
}

export function useOrders(eventId: string | undefined) {
  return useQuery({
    queryKey: ["events", eventId, "orders"],
    queryFn: async () => {
      const res = await api.get(`/events/${eventId}/orders`);
      return res.data.data.orders as OrderRecord[];
    },
    enabled: !!eventId,
  });
}

export function useOrdersSummary(eventId: string | undefined) {
  return useQuery({
    queryKey: ["events", eventId, "orders", "summary"],
    queryFn: async () => {
      const res = await api.get(`/events/${eventId}/orders/summary`);
      return res.data.data as OrdersSummary;
    },
    enabled: !!eventId,
  });
}

// --- Public (guest-facing) shop ----------------------------------------------

export function usePublicShop(rsvpToken: string | undefined) {
  return useQuery({
    queryKey: ["shop", rsvpToken],
    queryFn: async () => {
      const res = await api.get(`/shop/${rsvpToken}/products`);
      return res.data.data as PublicShopListing;
    },
    enabled: !!rsvpToken,
  });
}

export function useCheckout(rsvpToken: string) {
  return useMutation({
    mutationFn: async (input: {
      guestName: string;
      guestEmail: string;
      guestId?: string;
      items: { productId: string; quantity: number }[];
    }) => {
      const res = await api.post(`/shop/${rsvpToken}/checkout`, input);
      return res.data.data as { checkoutUrl: string };
    },
  });
}
