import { useState } from "react";
import { toast } from "sonner";
import * as Icons from "lucide-react";
import { ArrowDown, ArrowUp, Pencil, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Spinner } from "@/components/ui/Spinner";
import { ErrorState, EmptyState } from "@/components/ui/EmptyState";
import { ExportMenu } from "@/components/ui/ExportMenu";
import { getApiErrorMessage } from "@/lib/api";
import type { ExportColumn } from "@/lib/exportData";
import { useAdminServices, useDeleteService, useReorderServices } from "@/hooks/useLandingServices";
import type { LandingService } from "@/types";
import { ServiceFormModal } from "./ServiceFormModal";

const serviceColumns: ExportColumn<LandingService>[] = [
  { header: "Title", value: (s) => s.title },
  { header: "Description", value: (s) => s.description },
  { header: "Icon", value: (s) => s.icon },
  { header: "Visible", value: (s) => (s.isActive ? "Yes" : "Hidden") },
  { header: "Order", value: (s) => s.sortOrder },
];

export function ServicesTab() {
  const { data, isLoading, isError, refetch } = useAdminServices();
  const deleteService = useDeleteService();
  const reorderServices = useReorderServices();
  const [modalService, setModalService] = useState<LandingService | "new" | null>(null);

  if (isError) return <ErrorState title="We couldn't load services" onRetry={() => refetch()} />;
  if (isLoading || !data) return <Spinner />;

  async function handleDelete(service: LandingService) {
    if (!confirm(`Remove "${service.title}" from the landing page?`)) return;
    try {
      await deleteService.mutateAsync(service.id);
      toast.success("Service removed");
    } catch (err) {
      toast.error(getApiErrorMessage(err));
    }
  }

  async function move(index: number, direction: -1 | 1) {
    if (!data) return;
    const target = index + direction;
    if (target < 0 || target >= data.length) return;
    const reordered = [...data];
    [reordered[index], reordered[target]] = [reordered[target], reordered[index]];
    try {
      await reorderServices.mutateAsync(reordered.map((s) => s.id));
    } catch (err) {
      toast.error(getApiErrorMessage(err));
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-500">
          These cards appear in the "Services" section of the public landing page. Add a new one any time you offer
          something new.
        </p>
        <div className="flex items-center gap-2">
          <ExportMenu data={data} columns={serviceColumns} filename="services" title="Services" />
          <Button size="sm" onClick={() => setModalService("new")}>
            <Plus className="h-4 w-4" />
            Add service
          </Button>
        </div>
      </div>

      {data.length === 0 ? (
        <EmptyState title="No services yet" description="Add your first service card to show it on the landing page." />
      ) : (
        <div className="space-y-3">
          {data.map((service, index) => {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const Icon = (Icons as any)[service.icon] ?? Icons.Sparkles;
            return (
              <Card key={service.id} className="flex items-center gap-4 p-4">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-600">
                  <Icon className="h-5 w-5" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="truncate font-semibold text-slate-900">{service.title}</p>
                    {!service.isActive && <Badge variant="neutral">Hidden</Badge>}
                  </div>
                  <p className="truncate text-sm text-slate-500">{service.description}</p>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <button
                    onClick={() => move(index, -1)}
                    disabled={index === 0}
                    aria-label="Move up"
                    className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700 disabled:opacity-30"
                  >
                    <ArrowUp className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => move(index, 1)}
                    disabled={index === data.length - 1}
                    aria-label="Move down"
                    className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700 disabled:opacity-30"
                  >
                    <ArrowDown className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => setModalService(service)}
                    aria-label="Edit"
                    className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-brand-600"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(service)}
                    aria-label="Delete"
                    className="rounded-lg p-2 text-slate-400 hover:bg-danger-50 hover:text-danger-600"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <ServiceFormModal
        open={!!modalService}
        onClose={() => setModalService(null)}
        service={modalService === "new" ? undefined : modalService ?? undefined}
      />
    </div>
  );
}
