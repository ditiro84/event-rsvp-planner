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
// a hard failure like CANCELLED. When the guest has also ticked "I've
// already paid" at checkout (guestMarkedPaid), that's surfaced as its own
// distinct label/colour -- it's a claim to verify, not a confirmed payment,
// so it stays visually distinct from the real (processor-confirmed) Paid.
export function orderStatusDisplay(order: Pick<OrderRecord, "status" | "guestMarkedPaid">): {
  label: string;
  variant: "success" | "warning" | "info" | "danger";
} {
  if (order.status === "PAID") return { label: "Paid", variant: "success" };
  if (order.status === "MANUAL") {
    return order.guestMarkedPaid
      ? { label: "Guest says paid", variant: "info" }
      : { label: "Awaiting payment", variant: "warning" };
  }
  if (order.status === "PENDING") return { label: "Pending", variant: "warning" };
  return { label: "Cancelled", variant: "danger" };
}

// Orders placed for a given guest -- matched by Guest.id, which the guest's
// order is stamped with once they check out after submitting their RSVP
// (see PublicRsvpPage.tsx). Orders placed before a guestId was ever
// captured (or via a stale/anonymous session) won't match here.
export function ordersForGuest(orders: OrderRecord[] | undefined, guestId: string): OrderRecord[] {
  if (!orders) return [];
  return orders.filter((o) => o.guestId === guestId);
}
