import { COUNTRIES } from "@/lib/countries";
import type { OrderItemRecord, OrderRecord, OrderShippingAddress, OrderStatus } from "@/types";

// Shared between MerchandiseTab (the Recent Orders table) and RsvpTab (the
// per-guest merchandise summary) -- both want the same "one line, full
// detail on hover" presentation of an order's delivery info.

// Full postal address as one line -- country code resolved to its readable
// name (see lib/countries.ts).
export function formatShippingAddress(address: OrderShippingAddress): string {
  const countryName = address.country ? COUNTRIES.find((c) => c.code === address.country)?.name ?? address.country : null;
  const addressLine = [address.line1, address.line2, address.city, address.postcode, countryName].filter(Boolean).join(", ");
  return address.phone ? `${addressLine} • ${address.phone}` : addressLine;
}

// "Aso-Ebi for females (Size M) × 2, Fila for men × 1" -- includes the
// guest-selected size per line item when one was given.
export function formatOrderItems(items: OrderItemRecord[]): string {
  return items
    .map((i) => `${i.productName}${i.selectedSize ? ` (Size ${i.selectedSize})` : ""} × ${i.quantity}`)
    .join(", ");
}

// MANUAL = captured with no payment processor connected, see
// OrderStatus.MANUAL in schema.prisma -- the planner collects payment
// themselves, so this reads as a pending/awaiting-action state rather than
// a hard failure like CANCELLED.
export function orderStatusLabel(status: OrderStatus): string {
  if (status === "PAID") return "Paid";
  if (status === "MANUAL") return "Awaiting payment";
  if (status === "PENDING") return "Pending";
  return "Cancelled";
}

export function orderStatusBadgeVariant(status: OrderStatus): "success" | "warning" | "danger" {
  if (status === "PAID") return "success";
  if (status === "MANUAL") return "warning";
  return "danger";
}

// Orders placed for a given guest -- matched by Guest.id, which the guest's
// order is stamped with once they check out after submitting their RSVP
// (see PublicRsvpPage.tsx). Orders placed before a guestId was ever
// captured (or via a stale/anonymous session) won't match here.
export function ordersForGuest(orders: OrderRecord[] | undefined, guestId: string): OrderRecord[] {
  if (!orders) return [];
  return orders.filter((o) => o.guestId === guestId);
}
