import { useMemo, useState } from "react";
import { toast } from "sonner";
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Download,
  FileText,
  Grid2x2,
  MailOpen,
  Pencil,
  Plus,
  Search,
  Send,
  Star,
  Trash2,
  Upload,
  Users,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useDeleteGuest, useGuests, useExportGuestsCsv, useExportGuestsPdf, type GuestFilters } from "@/hooks/useGuests";
import { useBulkSendInviteEmails } from "@/hooks/useInvites";
import { useEventDashboard } from "@/hooks/useEvents";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { RsvpStatusBadge, Badge } from "@/components/ui/Badge";
import { EmptyState, ErrorState } from "@/components/ui/EmptyState";
import { Spinner } from "@/components/ui/Spinner";
import { Avatar } from "@/components/ui/Avatar";
import { cn } from "@/lib/cn";
import { getApiErrorMessage } from "@/lib/api";
import { GuestFormModal } from "./GuestFormModal";
import { CsvImportModal } from "./CsvImportModal";
import { InviteModal } from "./InviteModal";
import type { Guest } from "@/types";

const PAGE_SIZE = 8;

type SortKey = "name" | "rsvp" | "table";

// Dot-indicator summary chip -- one glance at Confirmed / Pending / Declined
// / Maybe / Needs a seat counts, matching the "summary-stats-bar" from the
// guest-management mockup. Backed by the same server-computed dashboard
// stats used on the Overview tab rather than a client recount, so the
// numbers always agree across tabs.
function StatChip({ dot, label, value }: { dot: string; label: string; value: number }) {
  return (
    <div className="flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3.5 py-2 text-sm">
      <span className={cn("h-2 w-2 rounded-full", dot)} />
      <span className="font-semibold text-slate-900">{value}</span>
      <span className="text-slate-500">{label}</span>
    </div>
  );
}

export function GuestsTab({ eventId, eventName }: { eventId: string; eventName: string }) {
  const navigate = useNavigate();
  const [filters, setFilters] = useState<GuestFilters>({});
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("name");
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const { data: guests, isLoading, isError, refetch } = useGuests(eventId, { ...filters, search: search || undefined });
  const { data: dashboard } = useEventDashboard(eventId);
  const deleteGuest = useDeleteGuest(eventId);
  const exportCsv = useExportGuestsCsv(eventId);
  const exportPdf = useExportGuestsPdf(eventId);
  const bulkSendInvites = useBulkSendInviteEmails(eventId);

  const [showAddGuest, setShowAddGuest] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [editingGuest, setEditingGuest] = useState<Guest | undefined>();
  const [invitingGuest, setInvitingGuest] = useState<Guest | undefined>();

  const sorted = useMemo(() => {
    if (!guests) return [];
    const list = [...guests];
    list.sort((a, b) => {
      if (sortKey === "rsvp") return a.rsvpStatus.localeCompare(b.rsvpStatus);
      if (sortKey === "table") {
        const ta = a.seatAssignment?.table.name ?? "￿";
        const tb = b.seatAssignment?.table.name ?? "￿";
        return ta.localeCompare(tb);
      }
      return `${a.firstName} ${a.lastName}`.localeCompare(`${b.firstName} ${b.lastName}`);
    });
    return list;
  }, [guests, sortKey]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pageGuests = sorted.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  function resetFiltering(next: GuestFilters) {
    setFilters(next);
    setPage(1);
    setSelected(new Set());
  }

  function toggleSelect(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleSelectAllOnPage() {
    setSelected((prev) => {
      const allSelected = pageGuests.every((g) => prev.has(g.id));
      const next = new Set(prev);
      pageGuests.forEach((g) => (allSelected ? next.delete(g.id) : next.add(g.id)));
      return next;
    });
  }

  async function handleDelete(guest: Guest) {
    if (!confirm(`Remove ${guest.firstName} ${guest.lastName} from the guest list?`)) return;
    try {
      await deleteGuest.mutateAsync(guest.id);
      toast.success("Guest removed");
    } catch (err) {
      toast.error(getApiErrorMessage(err));
    }
  }

  async function handleBulkRemove() {
    const ids = Array.from(selected);
    if (ids.length === 0) return;
    if (!confirm(`Remove ${ids.length} guest${ids.length === 1 ? "" : "s"} from the guest list?`)) return;
    try {
      await Promise.all(ids.map((id) => deleteGuest.mutateAsync(id)));
      toast.success(`Removed ${ids.length} guest${ids.length === 1 ? "" : "s"}`);
      setSelected(new Set());
    } catch (err) {
      toast.error(getApiErrorMessage(err));
    }
  }

  async function handleBulkReminder() {
    const ids = Array.from(selected);
    if (ids.length === 0) return;
    try {
      const result = await bulkSendInvites.mutateAsync(ids);
      if (result.failed > 0) {
        toast.warning(`Sent ${result.sent}/${result.total} reminders (${result.failed} failed)`);
      } else {
        toast.success(`Sent ${result.sent} reminder${result.sent === 1 ? "" : "s"}`);
      }
      setSelected(new Set());
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

  const rsvpChips: { label: string; value?: string }[] = [
    { label: "All", value: undefined },
    { label: "Confirmed", value: "CONFIRMED" },
    { label: "Pending", value: "PENDING" },
    { label: "Maybe", value: "MAYBE" },
    { label: "Declined", value: "DECLINED" },
  ];
  const seatingChips: { label: string; value?: "true" | "false" }[] = [
    { label: "All Seating", value: undefined },
    { label: "Assigned", value: "true" },
    { label: "Unassigned", value: "false" },
  ];

  const stats = dashboard?.stats;

  return (
    <div>
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-bold text-slate-900">{sorted.length} Guests</h2>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" size="sm" onClick={() => setShowImport(true)}>
            <Upload className="h-4 w-4" />
            Import
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
            Add Guest
          </Button>
        </div>
      </div>

      {stats && (
        <div className="mb-5 flex flex-wrap gap-2.5">
          <StatChip dot="bg-success-500" label="Confirmed" value={stats.confirmed} />
          <StatChip dot="bg-warning-500" label="Pending" value={stats.pending} />
          <StatChip dot="bg-danger-500" label="Declined" value={stats.declined} />
          <StatChip dot="bg-slate-400" label="Maybe" value={stats.maybe} />
          <StatChip dot="bg-purple-500" label="Needs a seat" value={stats.unassignedConfirmedGuests} />
        </div>
      )}

      <div className="rounded-xl2 border border-slate-200 bg-white">
        <div className="flex flex-col gap-4 border-b border-slate-100 p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="relative w-full sm:max-w-xs">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                placeholder="Search guests..."
                className="pl-9"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
              />
            </div>
            <div className="relative">
              <select
                value={sortKey}
                onChange={(e) => setSortKey(e.target.value as SortKey)}
                className="appearance-none rounded-lg border border-slate-200 bg-white py-2 pl-3 pr-8 text-sm font-medium text-slate-700 focus:border-brand-400 focus:outline-none"
              >
                <option value="name">Sort: Name</option>
                <option value="rsvp">Sort: RSVP status</option>
                <option value="table">Sort: Table</option>
              </select>
              <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {rsvpChips.map((chip) => (
              <button
                key={chip.label}
                onClick={() => resetFiltering({ ...filters, status: chip.value })}
                className={cn(
                  "rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
                  filters.status === chip.value
                    ? "border-brand-200 bg-brand-50 text-brand-700"
                    : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                )}
              >
                {chip.label}
              </button>
            ))}
            <div className="mx-1 h-4 w-px bg-slate-200" />
            {seatingChips.map((chip) => (
              <button
                key={chip.label}
                onClick={() => resetFiltering({ ...filters, assigned: chip.value })}
                className={cn(
                  "rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
                  filters.assigned === chip.value
                    ? "border-brand-200 bg-brand-50 text-brand-700"
                    : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                )}
              >
                {chip.label}
              </button>
            ))}
            <div className="mx-1 h-4 w-px bg-slate-200" />
            <button
              onClick={() => resetFiltering({ ...filters, dietary: filters.dietary === "true" ? undefined : "true" })}
              className={cn(
                "rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
                filters.dietary === "true"
                  ? "border-brand-200 bg-brand-50 text-brand-700"
                  : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
              )}
            >
              Dietary needs
            </button>
            <button
              onClick={() => resetFiltering({ ...filters, vip: filters.vip === "true" ? undefined : "true" })}
              className={cn(
                "rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
                filters.vip === "true"
                  ? "border-brand-200 bg-brand-50 text-brand-700"
                  : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
              )}
            >
              VIP
            </button>
          </div>
        </div>

        {isLoading && (
          <div className="p-8">
            <Spinner />
          </div>
        )}

        {isError && (
          <div className="p-8">
            <ErrorState title="We couldn't load the guest list" onRetry={() => refetch()} />
          </div>
        )}

        {!isLoading && !isError && sorted.length === 0 && (
          <div className="p-8">
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
          </div>
        )}

        {!isLoading && !isError && sorted.length > 0 && (
          <>
            {/* Desktop / tablet: full table */}
            <div className="hidden overflow-x-auto sm:block">
              <table className="min-w-full divide-y divide-slate-200 text-sm">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="w-10 px-4 py-3">
                      <input
                        type="checkbox"
                        className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                        checked={pageGuests.length > 0 && pageGuests.every((g) => selected.has(g.id))}
                        onChange={toggleSelectAllOnPage}
                        aria-label="Select all on page"
                      />
                    </th>
                    <th className="px-4 py-3 text-left font-medium text-slate-500">Guest</th>
                    <th className="px-4 py-3 text-left font-medium text-slate-500">Email</th>
                    <th className="px-4 py-3 text-left font-medium text-slate-500">RSVP</th>
                    <th className="px-4 py-3 text-left font-medium text-slate-500">Table</th>
                    <th className="px-4 py-3 text-left font-medium text-slate-500">Dietary</th>
                    <th className="px-4 py-3" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {pageGuests.map((guest) => (
                    <tr key={guest.id} className={cn("hover:bg-slate-50", selected.has(guest.id) && "bg-brand-50/40")}>
                      <td className="px-4 py-3">
                        <input
                          type="checkbox"
                          className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                          checked={selected.has(guest.id)}
                          onChange={() => toggleSelect(guest.id)}
                          aria-label={`Select ${guest.firstName} ${guest.lastName}`}
                        />
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2.5">
                          <Avatar firstName={guest.firstName} lastName={guest.lastName} />
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className="truncate font-medium text-slate-900">
                                {guest.firstName} {guest.lastName}
                              </span>
                              {guest.isVip && <Star className="h-3.5 w-3.5 shrink-0 fill-warning-500 text-warning-500" aria-label="VIP" />}
                            </div>
                            {guest.groupName && <p className="text-xs text-slate-400">{guest.groupName}</p>}
                          </div>
                        </div>
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
                          <Badge variant="unassigned">Unassigned</Badge>
                        )}
                      </td>
                      <td className="px-4 py-3 text-slate-600">
                        <div>{guest.mealPreference || "—"}</div>
                        {guest.dietaryRequirements && <div className="text-xs text-slate-400">{guest.dietaryRequirements}</div>}
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
            <div className="space-y-2.5 p-3 sm:hidden">
              {pageGuests.map((guest) => (
                <div key={guest.id} className="rounded-xl2 border border-slate-200 bg-white p-4 shadow-soft">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex min-w-0 items-center gap-2.5">
                      <Avatar firstName={guest.firstName} lastName={guest.lastName} />
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="truncate font-medium text-slate-900">
                            {guest.firstName} {guest.lastName}
                          </span>
                          {guest.isVip && <Star className="h-3.5 w-3.5 shrink-0 fill-warning-500 text-warning-500" />}
                        </div>
                        {guest.email && <p className="truncate text-xs text-slate-500">{guest.email}</p>}
                      </div>
                    </div>
                    <RsvpStatusBadge status={guest.rsvpStatus} />
                  </div>

                  <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-slate-500">
                    {guest.seatAssignment ? (
                      <span>
                        {guest.seatAssignment.table.name}
                        {guest.seatAssignment.seat ? ` · Seat ${guest.seatAssignment.seat.seatNumber}` : ""}
                      </span>
                    ) : (
                      <Badge variant="unassigned">Unassigned</Badge>
                    )}
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

            <div className="flex items-center justify-between gap-3 border-t border-slate-100 px-4 py-3">
              <p className="text-xs text-slate-400">
                Showing {(currentPage - 1) * PAGE_SIZE + 1}–{Math.min(currentPage * PAGE_SIZE, sorted.length)} of {sorted.length}
              </p>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-40"
                  aria-label="Previous page"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                {Array.from({ length: totalPages }, (_, i) => i + 1)
                  .slice(0, 5)
                  .map((p) => (
                    <button
                      key={p}
                      onClick={() => setPage(p)}
                      className={cn(
                        "flex h-8 w-8 items-center justify-center rounded-lg text-sm font-medium",
                        p === currentPage ? "bg-brand-600 text-white" : "text-slate-600 hover:bg-slate-50"
                      )}
                    >
                      {p}
                    </button>
                  ))}
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-40"
                  aria-label="Next page"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {selected.size > 0 && (
        <div className="sticky bottom-4 mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl2 border border-slate-200 bg-slate-900 px-5 py-3.5 text-white shadow-lg">
          <p className="text-sm font-medium">
            {selected.size} guest{selected.size === 1 ? "" : "s"} selected
          </p>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => navigate(`/events/${eventId}/seating`)}
              className="flex items-center gap-1.5 rounded-lg bg-white/10 px-3 py-1.5 text-xs font-semibold hover:bg-white/20"
            >
              <Grid2x2 className="h-3.5 w-3.5" />
              Assign to Table
            </button>
            <button
              onClick={handleBulkReminder}
              className="flex items-center gap-1.5 rounded-lg bg-white/10 px-3 py-1.5 text-xs font-semibold hover:bg-white/20"
            >
              <MailOpen className="h-3.5 w-3.5" />
              Send RSVP Reminder
            </button>
            <button
              onClick={handleBulkRemove}
              className="flex items-center gap-1.5 rounded-lg bg-danger-500/90 px-3 py-1.5 text-xs font-semibold hover:bg-danger-500"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Remove
            </button>
          </div>
        </div>
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
