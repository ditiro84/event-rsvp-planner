import { useState } from "react";
import { toast } from "sonner";
import { Package, Pencil, Plus, ShoppingCart, Store, Trash2 } from "lucide-react";
import { useDeleteProduct, useOrders, useOrdersSummary, useProducts, productImageUrl } from "@/hooks/useProducts";
import { useUpdateEvent } from "@/hooks/useEvents";
import { Card, StatCard } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { EmptyState, ErrorState } from "@/components/ui/EmptyState";
import { Spinner } from "@/components/ui/Spinner";
import { formatDate } from "@/lib/format";
import { getApiErrorMessage } from "@/lib/api";
import { ProductFormModal } from "./ProductFormModal";
import type { EventRecord, ProductRecord } from "@/types";

function stockBadge(product: ProductRecord) {
  if (product.stockQuantity === null) return <Badge variant="success">In Stock</Badge>;
  if (product.stockQuantity === 0) return <Badge variant="danger">Sold Out</Badge>;
  if (product.stockQuantity <= 5) return <Badge variant="warning">{product.stockQuantity} remaining</Badge>;
  return <Badge variant="success">In Stock</Badge>;
}

export function MerchandiseTab({ event }: { event: EventRecord }) {
  const { data: products, isLoading, isError, refetch } = useProducts(event.id);
  const { data: summary } = useOrdersSummary(event.id);
  const { data: orders } = useOrders(event.id);
  const deleteProduct = useDeleteProduct(event.id);
  const updateEvent = useUpdateEvent(event.id);
  const [showForm, setShowForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState<ProductRecord | undefined>();

  async function handleDelete(product: ProductRecord) {
    if (!confirm(`Remove "${product.name}"? This cannot be undone.`)) return;
    try {
      await deleteProduct.mutateAsync(product.id);
      toast.success("Product removed");
    } catch (err) {
      toast.error(getApiErrorMessage(err));
    }
  }

  async function handleToggleShop() {
    try {
      await updateEvent.mutateAsync({ merchandiseEnabled: !event.merchandiseEnabled });
      toast.success(event.merchandiseEnabled ? "Shop closed to guests" : "Shop is now open to guests");
    } catch (err) {
      toast.error(getApiErrorMessage(err));
    }
  }

  if (isError) return <ErrorState title="We couldn't load the shop" onRetry={() => refetch()} />;
  if (isLoading || !products) return <Spinner />;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="font-display text-2xl font-bold text-slate-950">Event Merchandise</h1>
            <Badge variant={event.merchandiseEnabled ? "success" : "neutral"}>
              {event.merchandiseEnabled ? "Preview Enabled" : "Preview Disabled"}
            </Badge>
            <Badge variant="info">Checkout coming soon</Badge>
          </div>
          <p className="mt-1 text-sm text-slate-500">
            Guests can browse merchandise when they RSVP. Purchasing is a future release — set up your catalog now
            so it's ready.
          </p>
        </div>
        <div className="flex shrink-0 gap-2.5">
          <Button variant="secondary" onClick={handleToggleShop} isLoading={updateEvent.isPending}>
            <Store className="h-4 w-4" />
            {event.merchandiseEnabled ? "Disable Preview" : "Enable Preview"}
          </Button>
          <Button
            onClick={() => {
              setEditingProduct(undefined);
              setShowForm(true);
            }}
          >
            <Plus className="h-4 w-4" />
            Add Product
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard
          label="Total Sales"
          value={`$${(summary?.totalSales ?? 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}`}
          accent="purple"
          icon={<ShoppingCart className="h-4 w-4" />}
        />
        <StatCard label="Orders" value={summary?.orderCount ?? 0} icon={<ShoppingCart className="h-4 w-4" />} />
        <StatCard label="Items Sold" value={summary?.itemsSold ?? 0} icon={<Package className="h-4 w-4" />} />
      </div>

      <div>
        <h2 className="mb-4 text-lg font-bold text-slate-900">Products</h2>
        {products.length === 0 ? (
          <EmptyState
            icon={<Package className="h-6 w-6" />}
            title="No products yet"
            description="Add items like favours, apparel, or add-ons for guests to buy when they RSVP."
            action={
              <Button
                onClick={() => {
                  setEditingProduct(undefined);
                  setShowForm(true);
                }}
              >
                <Plus className="h-4 w-4" />
                Add Product
              </Button>
            }
          />
        ) : (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {products.map((product) => (
              <Card key={product.id} className="flex flex-col overflow-hidden">
                <div className="h-40 w-full shrink-0 bg-slate-100">
                  {product.hasImage ? (
                    <img src={productImageUrl(event.id, product.id)} alt={product.name} className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-slate-300">
                      <Package className="h-8 w-8" />
                    </div>
                  )}
                </div>
                <div className="flex flex-1 flex-col gap-4 p-5">
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center justify-between">
                      <p className="text-lg font-bold text-slate-900">${product.price.toLocaleString(undefined, { maximumFractionDigits: 2 })}</p>
                      {stockBadge(product)}
                    </div>
                    <p className="truncate font-semibold text-slate-900">{product.name}</p>
                    {!product.active && <span className="text-xs text-slate-400">Hidden from shop</span>}
                  </div>
                  <div className="h-px w-full bg-slate-100" />
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-500">{product.soldCount} sold</span>
                    <div className="flex gap-1">
                      <button
                        onClick={() => {
                          setEditingProduct(product);
                          setShowForm(true);
                        }}
                        className="flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(product)}
                        aria-label={`Remove ${product.name}`}
                        className="rounded-lg p-1.5 text-slate-400 hover:bg-danger-50 hover:text-danger-600"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              </Card>
            ))}
            <button
              onClick={() => {
                setEditingProduct(undefined);
                setShowForm(true);
              }}
              className="flex min-h-[280px] flex-col items-center justify-center gap-3 rounded-xl2 border-2 border-dashed border-brand-300 bg-white p-8 text-center hover:bg-brand-50/40"
            >
              <span className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-50">
                <Plus className="h-6 w-6 text-brand-600" />
              </span>
              <span>
                <span className="block font-bold text-brand-700">Add New Product</span>
                <span className="mt-1 block text-xs text-slate-500">List another item for guests to buy</span>
              </span>
            </button>
          </div>
        )}
      </div>

      <div>
        <h2 className="mb-4 text-lg font-bold text-slate-900">Recent Orders</h2>
        {!orders || orders.length === 0 ? (
          <EmptyState title="No orders yet" description="Paid orders will show up here once guests start buying." />
        ) : (
          <Card className="overflow-hidden">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-100 bg-slate-50/60 text-xs font-medium uppercase tracking-wide text-slate-400">
                <tr>
                  <th className="px-5 py-3">Guest</th>
                  <th className="px-5 py-3">Items Purchased</th>
                  <th className="px-5 py-3 text-right">Total</th>
                  <th className="px-5 py-3 text-center">Status</th>
                  <th className="px-5 py-3">Delivery Method</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {orders.slice(0, 10).map((order) => (
                  <tr key={order.id}>
                    <td className="px-5 py-3.5">
                      <p className="font-semibold text-slate-900">{order.guestName}</p>
                      <p className="text-xs text-slate-400">{formatDate(order.createdAt)}</p>
                    </td>
                    <td className="px-5 py-3.5 text-slate-600">
                      {order.items.map((i) => `${i.productName} × ${i.quantity}`).join(", ")}
                    </td>
                    <td className="px-5 py-3.5 text-right font-bold text-slate-900">
                      ${order.total.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                    </td>
                    <td className="px-5 py-3.5 text-center">
                      <Badge variant={order.status === "PAID" ? "success" : "danger"}>
                        {order.status === "PAID" ? "Paid" : "Cancelled"}
                      </Badge>
                    </td>
                    <td className="px-5 py-3.5 text-slate-600">
                      {order.deliveryMethod === "AT_EVENT" ? "At Event" : order.deliveryMethod}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        )}
      </div>

      <ProductFormModal open={showForm} onClose={() => setShowForm(false)} eventId={event.id} product={editingProduct} />
    </div>
  );
}
