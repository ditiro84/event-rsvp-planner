import { useState } from "react";
import { toast } from "sonner";
import { DollarSign, Pencil, Plus, Store, Trash2 } from "lucide-react";
import { useDeleteVendor, useVendors, useVendorSummary } from "@/hooks/useVendors";
import { StatCard } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Tooltip } from "@/components/ui/Tooltip";
import { EmptyState, ErrorState } from "@/components/ui/EmptyState";
import { Spinner } from "@/components/ui/Spinner";
import { getApiErrorMessage } from "@/lib/api";
import { formatMoney, formatMoneyBreakdownParts, formatMoneyBreakdownSymbols } from "@/lib/format";
import { VendorFormModal } from "./VendorFormModal";
import type { VendorRecord, VendorStatus } from "@/types";

const STATUS_VARIANT: Record<VendorStatus, "neutral" | "info" | "brand" | "success" | "danger"> = {
  CONTACTED: "neutral",
  QUOTE_RECEIVED: "info",
  BOOKED: "brand",
  CONFIRMED: "success",
  CANCELLED: "danger",
};

function statusLabel(status: VendorStatus) {
  return status.replace(/_/g, " ").toLowerCase().replace(/^\w/, (m) => m.toUpperCase());
}

function categoryLabel(category: string) {
  return category.replace(/_/g, " ").toLowerCase().replace(/^\w/, (m) => m.toUpperCase());
}

export function VendorsTab({ eventId }: { eventId: string }) {
  const { data: vendors, isLoading, isError, refetch } = useVendors(eventId);
  const { data: summary } = useVendorSummary(eventId);
  const deleteVendor = useDeleteVendor(eventId);
  const [showForm, setShowForm] = useState(false);
  const [editingVendor, setEditingVendor] = useState<VendorRecord | undefined>();
  // The actual currency symbols in use (e.g. "£₦" once vendors are paid in
  // more than one currency) -- a fixed "$" icon was misleading whenever a
  // planner's costs were entirely in GBP/NGN, or flat wrong once costs
  // spanned more than one currency at a time.
  const costSymbols = formatMoneyBreakdownSymbols(summary?.costsByCurrency ?? []);
  // Each currency's total (vendors in the same currency already summed
  // together server-side) on its own line, e.g. "£6,000.00" then
  // "₦200,000.00" -- easier to scan than joining them with "+" on one line.
  const costParts = formatMoneyBreakdownParts(summary?.costsByCurrency ?? []);

  async function handleDelete(vendor: VendorRecord) {
    if (!confirm(`Remove "${vendor.name}" from vendors?`)) return;
    try {
      await deleteVendor.mutateAsync(vendor.id);
      toast.success("Vendor removed");
    } catch (err) {
      toast.error(getApiErrorMessage(err));
    }
  }

  if (isError) return <ErrorState title="We couldn't load vendors" onRetry={() => refetch()} />;
  if (isLoading || !vendors) return <Spinner />;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-xl font-bold text-slate-950">Vendors</h1>
          <p className="mt-0.5 text-sm text-slate-500">Track caterers, venues, and every other vendor for this event.</p>
        </div>
        <Button
          onClick={() => {
            setEditingVendor(undefined);
            setShowForm(true);
          }}
        >
          <Plus className="h-4 w-4" />
          Add Vendor
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label="Total Vendors" value={summary?.totalVendors ?? vendors.length} accent="coral" icon={<Store className="h-4 w-4" />} />
        <StatCard
          label="Booked / Confirmed"
          value={summary?.bookedCount ?? 0}
          accent="green"
          icon={<Store className="h-4 w-4" />}
        />
        <StatCard
          label="Total Cost"
          value={
            costParts.length === 0 ? (
              "—"
            ) : costParts.length === 1 ? (
              costParts[0]
            ) : (
              <div className="flex flex-col gap-0.5">
                {costParts.map((part) => (
                  <span key={part}>{part}</span>
                ))}
              </div>
            )
          }
          accent="purple"
          icon={
            costSymbols ? (
              <span className="text-sm font-bold leading-none" aria-hidden="true">
                {costSymbols}
              </span>
            ) : (
              <DollarSign className="h-4 w-4" />
            )
          }
        />
      </div>

      {vendors.length === 0 ? (
        <EmptyState
          icon={<Store className="h-6 w-6" />}
          title="No vendors yet"
          description="Add caterers, photographers, florists, and other vendors to keep every booking in one place."
          action={
            <Button
              onClick={() => {
                setEditingVendor(undefined);
                setShowForm(true);
              }}
            >
              <Plus className="h-4 w-4" />
              Add Vendor
            </Button>
          }
        />
      ) : (
        <div className="overflow-hidden rounded-xl2 border border-slate-200/80 bg-white shadow-card">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-100 bg-slate-50/60 text-xs font-medium uppercase tracking-wide text-slate-400">
              <tr>
                <th className="px-5 py-3">Vendor</th>
                <th className="px-5 py-3">Category</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3">Contact</th>
                <th className="px-5 py-3">Cost</th>
                <th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {vendors.map((vendor) => (
                <tr key={vendor.id} className="hover:bg-slate-50/60">
                  <td className="px-5 py-3.5">
                    <p className="font-medium text-slate-900">{vendor.name}</p>
                    {vendor.depositPaid && <span className="text-xs text-success-600">Deposit paid</span>}
                  </td>
                  <td className="px-5 py-3.5 text-slate-600">{categoryLabel(vendor.category)}</td>
                  <td className="px-5 py-3.5">
                    <Badge variant={STATUS_VARIANT[vendor.status]}>{statusLabel(vendor.status)}</Badge>
                  </td>
                  <td className="px-5 py-3.5 text-slate-600">
                    {vendor.contactName || vendor.email || vendor.phone || <span className="text-slate-300">—</span>}
                  </td>
                  <td className="px-5 py-3.5 text-slate-600">
                    {vendor.cost != null ? formatMoney(vendor.cost, vendor.currency) : "—"}
                  </td>
                  <td className="px-5 py-3.5">
                    <div className="flex justify-end gap-1.5">
                      <Tooltip label="Edit vendor">
                        <button
                          onClick={() => {
                            setEditingVendor(vendor);
                            setShowForm(true);
                          }}
                          aria-label={`Edit ${vendor.name}`}
                          className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                      </Tooltip>
                      <Tooltip label="Remove vendor">
                        <button
                          onClick={() => handleDelete(vendor)}
                          aria-label={`Remove ${vendor.name}`}
                          className="rounded-lg p-1.5 text-slate-400 hover:bg-danger-50 hover:text-danger-600"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </Tooltip>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <VendorFormModal open={showForm} onClose={() => setShowForm(false)} eventId={eventId} vendor={editingVendor} />
    </div>
  );
}
