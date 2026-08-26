import { useState } from "react";
import { toast } from "sonner";
import { Pencil, Plus, Tag, Ticket, Trash2, Users } from "lucide-react";
import { useDeleteTicketType, useTicketTypes } from "@/hooks/useTicketTypes";
import { Card, StatCard } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Tooltip } from "@/components/ui/Tooltip";
import { EmptyState, ErrorState } from "@/components/ui/EmptyState";
import { Spinner } from "@/components/ui/Spinner";
import { formatDate, formatMoney } from "@/lib/format";
import { getApiErrorMessage } from "@/lib/api";
import { TicketTypeFormModal } from "./TicketTypeFormModal";
import { PublishSettingsPanel } from "./PublishSettingsPanel";
import { TicketScanPanel } from "./TicketScanPanel";
import type { EventRecord, TicketTypeRecord } from "@/types";

function capacityBadge(ticketType: TicketTypeRecord) {
  if (ticketType.quantityRemaining === null) return <Badge variant="success">Unlimited</Badge>;
  if (ticketType.quantityRemaining === 0) return <Badge variant="danger">Sold Out</Badge>;
  if (ticketType.quantityRemaining <= 10) return <Badge variant="warning">{ticketType.quantityRemaining} left</Badge>;
  return <Badge variant="success">{ticketType.quantityRemaining} left</Badge>;
}

export function TicketsTab({ event }: { event: EventRecord }) {
  const { data: ticketTypes, isLoading, isError, refetch } = useTicketTypes(event.id);
  const deleteTicketType = useDeleteTicketType(event.id);
  const [showForm, setShowForm] = useState(false);
  const [editingTicketType, setEditingTicketType] = useState<TicketTypeRecord | undefined>();

  async function handleDelete(ticketType: TicketTypeRecord) {
    if (!confirm(`Remove "${ticketType.name}"? This cannot be undone.`)) return;
    try {
      await deleteTicketType.mutateAsync(ticketType.id);
      toast.success("Ticket type removed");
    } catch (err) {
      toast.error(getApiErrorMessage(err));
    }
  }

  if (isError) return <ErrorState title="We couldn't load ticket types" onRetry={() => refetch()} />;
  if (isLoading || !ticketTypes) return <Spinner />;

  const totalCapacity = ticketTypes.reduce((sum, t) => sum + (t.quantityTotal ?? 0), 0);
  const totalSold = ticketTypes.reduce((sum, t) => sum + t.quantitySold, 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="font-display text-2xl font-bold text-slate-950">Tickets</h1>
            <Badge variant={event.isPublic ? "success" : "neutral"}>{event.isPublic ? "Public" : "Not published"}</Badge>
          </div>
          <p className="mt-1 text-sm text-slate-500">
            Sell admission to the public -- separate from the private RSVP guest list. Set up ticket types below,
            then publish the event so anyone can buy.
          </p>
        </div>
        <Button
          onClick={() => {
            setEditingTicketType(undefined);
            setShowForm(true);
          }}
        >
          <Plus className="h-4 w-4" />
          Add Ticket Type
        </Button>
      </div>

      {/* Keyed on event.id so the panel's local form state doesn't leak
          between events if a planner navigates from one event's Tickets
          tab straight to another's without this route component
          unmounting. */}
      <PublishSettingsPanel key={event.id} event={event} />

      <TicketScanPanel eventId={event.id} />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label="Ticket Types" value={ticketTypes.length} icon={<Ticket className="h-4 w-4" />} />
        <StatCard label="Tickets Sold" value={totalSold} accent="purple" icon={<Users className="h-4 w-4" />} />
        <StatCard
          label="Total Capacity"
          value={totalCapacity > 0 ? totalCapacity : "Unlimited"}
          icon={<Tag className="h-4 w-4" />}
        />
      </div>

      <div>
        <h2 className="mb-4 text-lg font-bold text-slate-900">Ticket Types</h2>
        {ticketTypes.length === 0 ? (
          <EmptyState
            icon={<Ticket className="h-6 w-6" />}
            title="No ticket types yet"
            description="Add General Admission, VIP, or Early Bird tiers for guests to buy on the public event page."
            action={
              <Button
                onClick={() => {
                  setEditingTicketType(undefined);
                  setShowForm(true);
                }}
              >
                <Plus className="h-4 w-4" />
                Add Ticket Type
              </Button>
            }
          />
        ) : (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {ticketTypes.map((ticketType) => (
              <Card key={ticketType.id} className="flex flex-col p-5">
                <div className="flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <p className="text-lg font-bold text-slate-900">{formatMoney(ticketType.price, ticketType.currency)}</p>
                    {capacityBadge(ticketType)}
                  </div>
                  <p className="truncate font-semibold text-slate-900">{ticketType.name}</p>
                  {ticketType.description && <p className="line-clamp-2 text-xs text-slate-500">{ticketType.description}</p>}
                  {!ticketType.isActive && <span className="text-xs text-slate-400">Not on sale</span>}
                  {(ticketType.salesStartAt || ticketType.salesEndAt) && (
                    <p className="text-xs text-slate-400">
                      {ticketType.salesStartAt ? `From ${formatDate(ticketType.salesStartAt)}` : ""}
                      {ticketType.salesStartAt && ticketType.salesEndAt ? " — " : ""}
                      {ticketType.salesEndAt ? `Until ${formatDate(ticketType.salesEndAt)}` : ""}
                    </p>
                  )}
                </div>
                <div className="my-4 h-px w-full bg-slate-100" />
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-500">{ticketType.quantitySold} sold</span>
                  <div className="flex gap-1">
                    <button
                      onClick={() => {
                        setEditingTicketType(ticketType);
                        setShowForm(true);
                      }}
                      className="flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                      Edit
                    </button>
                    <Tooltip label="Remove ticket type">
                      <button
                        onClick={() => handleDelete(ticketType)}
                        aria-label={`Remove ${ticketType.name}`}
                        className="rounded-lg p-1.5 text-slate-400 hover:bg-danger-50 hover:text-danger-600"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </Tooltip>
                  </div>
                </div>
              </Card>
            ))}
            <button
              onClick={() => {
                setEditingTicketType(undefined);
                setShowForm(true);
              }}
              className="flex min-h-[180px] flex-col items-center justify-center gap-3 rounded-xl2 border-2 border-dashed border-brand-300 bg-white p-8 text-center hover:bg-brand-50/40"
            >
              <span className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-50">
                <Plus className="h-6 w-6 text-brand-600" />
              </span>
              <span>
                <span className="block font-bold text-brand-700">Add Ticket Type</span>
                <span className="mt-1 block text-xs text-slate-500">Another tier for guests to buy</span>
              </span>
            </button>
          </div>
        )}
      </div>

      <TicketTypeFormModal
        open={showForm}
        onClose={() => setShowForm(false)}
        eventId={event.id}
        ticketType={editingTicketType}
      />
    </div>
  );
}
