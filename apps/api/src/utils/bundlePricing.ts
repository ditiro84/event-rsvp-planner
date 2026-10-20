// Splits a bundle's price across the products inside it, in proportion to what
// each would cost on its own, so every order line carries a sensible price and
// the lines add up to the bundle price exactly (any leftover cent goes to the
// last product). The order total itself uses the bundle price, so this is only
// about how the lines read on receipts and exports.
//
// Returns total cents per product for ONE unit of the bundle (that product's
// quantity in the bundle included).
export function allocateBundlePrice(
  bundlePriceCents: number,
  members: { productId: string; priceCents: number; quantity: number }[]
): Map<string, number> {
  const result = new Map<string, number>();
  if (members.length === 0) return result;

  const weights = members.map((m) => m.priceCents * m.quantity);
  const totalWeight = weights.reduce((a, b) => a + b, 0);
  // All products free on their own: split by quantity instead.
  const effective = totalWeight > 0 ? weights : members.map((m) => m.quantity);
  const effectiveTotal = effective.reduce((a, b) => a + b, 0);

  let allocated = 0;
  members.forEach((m, index) => {
    const isLast = index === members.length - 1;
    const share = isLast ? bundlePriceCents - allocated : Math.floor((bundlePriceCents * effective[index]) / effectiveTotal);
    allocated += share;
    result.set(m.productId, share);
  });
  return result;
}
