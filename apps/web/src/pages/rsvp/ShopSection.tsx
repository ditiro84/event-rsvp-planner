import { Package, ShoppingBag } from "lucide-react";
import { usePublicShop, publicProductImageUrl } from "@/hooks/useProducts";
import { Spinner } from "@/components/ui/Spinner";
import { Badge } from "@/components/ui/Badge";
import type { PublicShopProduct } from "@/types";

function money(value: number) {
  return `$${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

// Browse-only preview for now -- purchasing is a v2 feature. The checkout
// mutation (useCheckout, in useProducts.ts) and the Stripe-backed backend
// route are already built; this component intentionally never calls them,
// so there's no half-working cart/payment flow exposed to guests yet.
function ProductPreviewCard({ product }: { product: PublicShopProduct }) {
  const soldOut = product.stockQuantity === 0;
  return (
    <div className="flex items-center gap-3 py-3">
      <div className="h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-slate-100">
        {product.hasImage ? (
          <img src={publicProductImageUrl(product.id)} alt={product.name} className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-slate-300">
            <Package className="h-5 w-5" />
          </div>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-slate-900">{product.name}</p>
        {product.description && <p className="truncate text-xs text-slate-500">{product.description}</p>}
        <p className="mt-0.5 text-sm font-medium text-brand-700">{money(product.price)}</p>
      </div>
      {soldOut && <span className="shrink-0 text-xs font-medium text-slate-400">Sold out</span>}
    </div>
  );
}

export function ShopSection({ rsvpToken }: { rsvpToken: string }) {
  const { data, isLoading } = usePublicShop(rsvpToken);

  if (isLoading) {
    return (
      <div className="mt-6 flex justify-center rounded-xl2 border border-slate-200 bg-white p-6 shadow-card">
        <Spinner />
      </div>
    );
  }

  const products = data?.products ?? [];
  if (!data?.enabled || products.length === 0) return null;

  return (
    <div className="mt-6 rounded-xl2 border border-slate-200 bg-white p-5 shadow-card">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <ShoppingBag className="h-5 w-5 text-brand-600" />
          <h2 className="font-display text-lg font-semibold text-slate-900">Event Shop</h2>
        </div>
        <Badge variant="neutral">Coming soon</Badge>
      </div>
      <p className="mt-1 text-sm text-slate-500">
        A preview of merchandise for this event — purchasing opens soon.
      </p>

      <div className="mt-3 divide-y divide-slate-100">
        {products.map((product) => (
          <ProductPreviewCard key={product.id} product={product} />
        ))}
      </div>
    </div>
  );
}
