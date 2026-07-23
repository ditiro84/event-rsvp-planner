import { useState } from "react";
import { toast } from "sonner";
import { Download, FileText, Pencil, Plus, Search, Send, Star, Trash2, Upload, Users } from "lucide-react";
import { useDeleteGuest, useGuests, useExportGuestsCsv, useExportGuestsPdf, type GuestFilters } from "@/hooks/useGuests";
import { useBulkSendInviteEmails } from "@/hooks/useInvites";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { RsvpStatusBadge, Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { Spinner } from "@/components/ui/Spinner";
import { cn } from "@/lib/cn";
import { getApiErrorMessage } from "@/lib/api";
import { GuestFormModal } from "./GuestFormModal";
import { CsvImportModal } from "./CsvImportModal";
import { InviteModal } from "./InviteModal";
import type { Guest } from "@/types";

export function GuestsTab({ eventId, eventName }: { eventId: string; eventName: string }) {
  const [filters, setFilters] = useState<GuestFilters>({});
  const [search, setSearch] = useState("");
  const { data: guests, isLoading } = useGuests(eventId, { ...filters, search: search || undefined });
  const deleteGuest = useDeleteGuest(eventId);
  const exportCsv = useExportGuestsCsv(eventId);
  const exportPdf = useExportGuestsPdf(eventId);
  const bulkSendInvites = useBulkSendInviteEmails(eventId);

  const [showAddGuest, setShowAddGuest] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [editingGuest, setEditingGuest] = useState<Guest | undefined>();
  const [invitingGuest, setInvitingGuest] = useState<Guest | undefined>();

  async function handleDelete(guest: Guest) {
    if (!confirm(`Remove ${guest.firstName} ${guest.lastName} from the guest list?`)) return;
    try {
      await deleteGuest.mutateAsync(guest.id);
      toast.success("Guest removed");
    } catch (err) {
      toast.error(getApiErrorMessage(err));
    }
  }

  async function handleBulkSendInvites() {
    if (!confirm("Email an invite (with QR code) to every guest who has an email address on file?")) return;
    try {
      const result = await bulkSendInvites.mutateAsync(undefined);
      if (result.failed > 0) {
        toast.warning(`Sent ${result.sent}/${result.total} invites (${result.failed} failed — check RESEND_API_KEY is configured)`);
      } else {
        toast.success(`Sent ${result.sent} invite${result.sent === 1 ? "" : "s"}`);
      }
    } catch (err) {
      toast.error(getApiErrorMessage(err));
    }
  }

  const quickFilters: { label: string; active: boolean; onClick: () => void }[] = [
    {
      label: "Not responded",
      active: filters.status === "PENDING",
      onClick: () => setFilters((f) => ({ ...f, status: f.status === "PENDING" ? undefined : "PENDING" })),
    },
    {
      label: "Needs a seat",
      active: filters.status === "CONFIRMED" && filters.assigned === "false",
      onClick: () =>
        setFilters((f) =>
          f.status === "CONFIRMED" && f.assigned === "false"
            ? { ...f, status: undefined, assigned: undefined }
            : { ...f, status: "CONFIRMED", assigned: "false" }
        ),
    },
    {
      label: "Dietary needs",
      active: filters.dietary === "true",
      onClick: () => setFilters((f) => ({ ...f, dietary: f.dietary === "true" ? undefined : "true" })),
    },
    {
      label: "Not checked in",
      active: filters.checkedIn === "false",
      onClick: () => setFilters((f) => ({ ...f, checkedIn: f.checkedIn === "false" ? undefined : "false" })),
    },
    {
      label: "VIP",
      active: filters.vip === "true",
      onClick: () => setFilters((f) => ({ ...f, vip: f.vip === "true" ? undefined : "true" })),
    },
  ];

  return (
    <div>
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:max-w-xs">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input
            placeholder="Search guests..."
            className="pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" size="sm" onClick={() => setShowImport(true)}>
            <Upload className="h-4 w-4" />
            Import CSV
          </Button>
          <Button variant="secondary" size="sm" onClick={() => exportCsv.mutate()} isLoading={exportCsv.isPending}>
            <Download className="h-4 w-4" />
            Export CSV
          </Button>
          <Button variant="secondary" size="sm" onClick={() => exportPdf.mutate()} isLoading={exportPdf.isPending}>
            <FileText className="h-4 w-4" />
            Export PDF
          </Button>
          <Button variant="secondary" size="sm" onClick={handleBulkSendInvites} isLoading={bulkSendInvites.isPending}>
            <Send className="h-4 w-4" />
            Email all invites
          </Button>
          <Button size="sm" onClick={() => setShowAddGuest(true)}>
            <Plus className="h-4 w-4" />
            Add guest
          </Button>
        </div>
      </div>

      <div className="mb-5 flex flex-wrap gap-2">
        {quickFilters.map((chip) => (
          <button
            key={chip.label}
            onClick={chip.onClick}
            className={cn(
              "rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
              chip.active
                ? "border-brand-200 bg-brand-50 text-brand-700"
                : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
            )}
          >
            {chip.label}
          </button>
        ))}
      </div>

      {isLoading && <Spinner />}

      {!isLoading && guests?.length === 0 && (
        <EmptyState
          icon={<Users className="h-8 w-8" />}
          title="No guests yet"
          description="Add your first guest or import a guest list from a CSV file."
          action={
            <div className="flex gap-2">
              <Button variant="secondary" onClick={() => setShowImport(true)}>
                Import CSV
              </Button>
              <Button onClick={() => setShowAddGuest(true)}>Add a guest</Button>
            </div>
          }
        />
      )}

      {!isLoading && guests && guests.length > 0 && (
        <>
          {/* Desktop / tablet: full table */}
          <div className="hidden overflow-x-auto rounded-xl2 border border-slate-200 bg-white sm:block">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-4 py-3 text-left font-medium text-slate-500">Name</th>
                  <th className="px-4 py-3 text-left font-medium text-slate-500">Contact</th>
                  <th className="px-4 py-3 text-left font-medium text-slate-500">RSVP</th>
                  <th className="px-4 py-3 text-left font-medium text-slate-500">Table</th>
                  <th className="px-4 py-3 text-left font-medium text-slate-500">Meal / Dietary</th>
                  <th className="px-4 py-3 text-left font-medium text-slate-500">Check-in</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {guests.map((guest) => (
                  <tr key={guest.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-slate-900">
                          {guest.firstName} {guest.lastName}
                        </span>
                        {guest.isVip && (
                          <Star className="h-3.5 w-3.5 shrink-0 fill-warning-500 text-warning-500" aria-label="VIP" />
                        )}
                      </div>
                      {guest.groupName && <p className="text-xs text-slate-400">{guest.groupName}</p>}
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      <div>{guest.email || "—"}</div>
                      {guest.phone && <div className="text-xs text-slate-400">{guest.phone}</div>}
                    </td>
                    <td className="px-4 py-3">
                      <RsvpStatusBadge status={guest.rsvpStatus} />
                      {guest.additionalGuestsCount > 0 && (
                        <p className="mt-1 text-xs text-slate-400">+{guest.additionalGuestsCount} guest(s)</p>
                      )}
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {guest.seatAssignment ? (
                        <span>
                          {guest.seatAssignment.table.name}
                          {guest.seatAssignment.seat ? ` · Seat ${guest.seatAssignment.seat.seatNumber}` : ""}
                        </span>
                      ) : (
                        <span className="text-slate-400">Unassigned</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      <div>{guest.mealPreference || "—"}</div>
                      {guest.dietaryRequirements && <div className="text-xs text-slate-400">{guest.dietaryRequirements}</div>}
                    </td>
                    <td className="px-4 py-3">
                      {guest.checkedIn ? (
                        <Badge variant="success">Checked in</Badge>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <GuestRowActions
                        guest={guest}
                        onInvite={() => setInvitingGuest(guest)}
                        onEdit={() => setEditingGuest(guest)}
                        onDelete={() => handleDelete(guest)}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile: card list */}
          <div className="space-y-2.5 sm:hidden">
            {guests.map((guest) => (
              <div key={guest.id} className="rounded-xl2 border border-slate-200 bg-white p-4 shadow-soft">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="truncate font-medium text-slate-900">
                        {guest.firstName} {guest.lastName}
                      </span>
                      {guest.isVip && <Star className="h-3.5 w-3.5 shrink-0 fill-warning-500 text-warning-500" />}
                    </div>
                    {guest.email && <p className="truncate text-xs text-slate-500">{guest.email}</p>}
                  </div>
                  <RsvpStatusBadge status={guest.rsvpStatus} />
                </div>

                <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500">
                  <span>
                    {guest.seatAssignment
                      ? `${guest.seatAssignment.table.name}${guest.seatAssignment.seat ? ` · Seat ${guest.seatAssignment.seat.seatNumber}` : ""}`
                      : "Unassigned"}
                  </span>
                  {guest.checkedIn && <Badge variant="success">Checked in</Badge>}
                  {guest.dietaryRequirements && <span>{guest.dietaryRequirements}</span>}
                </div>

                <div className="mt-3 flex justify-end border-t border-slate-100 pt-2.5">
                  <GuestRowActions
                    guest={guest}
                    onInvite={() => setInvitingGuest(guest)}
                    onEdit={() => setEditingGuest(guest)}
                    onDelete={() => handleDelete(guest)}
                  />
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      <GuestFormModal open={showAddGuest} onClose={() => setShowAddGuest(false)} eventId={eventId} />
      {editingGuest && (
        <GuestFormModal open={!!editingGuest} onClose={() => setEditingGuest(undefined)} eventId={eventId} guest={editingGuest} />
      )}
      <CsvImportModal open={showImport} onClose={() => setShowImport(false)} eventId={eventId} />
      {invitingGuest && (
        <InviteModal
          open={!!invitingGuest}
          onClose={() => setInvitingGuest(undefined)}
          eventId={eventId}
          eventName={eventName}
          guest={invitingGuest}
        />
      )}
    </div>
  );
}

function GuestRowActions({
  guest,
  onInvite,
  onEdit,
  onDelete,
}: {
  guest: Guest;
  onInvite: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="flex justify-end gap-1">
      <button
        aria-label={`Invite ${guest.firstName} ${guest.lastName}`}
        onClick={onInvite}
        className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-brand-600"
      >
        <Send className="h-4 w-4" />
      </button>
      <button
        aria-label={`Edit ${guest.firstName} ${guest.lastName}`}
        onClick={onEdit}
        className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
      >
        <Pencil className="h-4 w-4" />
      </button>
      <button
        aria-label={`Remove ${guest.firstName} ${guest.lastName}`}
        onClick={onDelete}
        className="rounded-lg p-1.5 text-slate-400 hover:bg-danger-50 hover:text-danger-600"
      >
        <Trash2 className="h-4 w-4" />
      </button>
    </div>
  );
}
