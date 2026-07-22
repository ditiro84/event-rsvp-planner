import { useState } from "react";
import { toast } from "sonner";
import { Download, Pencil, Plus, Search, Trash2, Upload, Users } from "lucide-react";
import { useDeleteGuest, useGuests, useExportGuestsCsv, type GuestFilters } from "@/hooks/useGuests";
import { Button } from "@/components/ui/Button";
import { Input, Select } from "@/components/ui/Input";
import { RsvpStatusBadge, Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { Spinner } from "@/components/ui/Spinner";
import { getApiErrorMessage } from "@/lib/api";
import { GuestFormModal } from "./GuestFormModal";
import { CsvImportModal } from "./CsvImportModal";
import type { Guest } from "@/types";

export function GuestsTab({ eventId }: { eventId: string }) {
  const [filters, setFilters] = useState<GuestFilters>({});
  const [search, setSearch] = useState("");
  const { data: guests, isLoading } = useGuests(eventId, { ...filters, search: search || undefined });
  const deleteGuest = useDeleteGuest(eventId);
  const exportCsv = useExportGuestsCsv(eventId);

  const [showAddGuest, setShowAddGuest] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [editingGuest, setEditingGuest] = useState<Guest | undefined>();

  async function handleDelete(guest: Guest) {
    if (!confirm(`Remove ${guest.firstName} ${guest.lastName} from the guest list?`)) return;
    try {
      await deleteGuest.mutateAsync(guest.id);
      toast.success("Guest removed");
    } catch (err) {
      toast.error(getApiErrorMessage(err));
    }
  }

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
          <Button size="sm" onClick={() => setShowAddGuest(true)}>
            <Plus className="h-4 w-4" />
            Add guest
          </Button>
        </div>
      </div>

      <div className="mb-4 flex flex-wrap gap-2">
        <Select
          className="w-auto"
          value={filters.status ?? ""}
          onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value || undefined }))}
        >
          <option value="">All statuses</option>
          <option value="PENDING">Pending</option>
          <option value="CONFIRMED">Confirmed</option>
          <option value="DECLINED">Declined</option>
          <option value="MAYBE">Maybe</option>
        </Select>
        <Select
          className="w-auto"
          value={filters.assigned ?? ""}
          onChange={(e) => setFilters((f) => ({ ...f, assigned: (e.target.value || undefined) as GuestFilters["assigned"] }))}
        >
          <option value="">Seating: any</option>
          <option value="true">Assigned</option>
          <option value="false">Unassigned</option>
        </Select>
        <Select
          className="w-auto"
          value={filters.vip ?? ""}
          onChange={(e) => setFilters((f) => ({ ...f, vip: (e.target.value || undefined) as GuestFilters["vip"] }))}
        >
          <option value="">VIP: any</option>
          <option value="true">VIP only</option>
        </Select>
        <Select
          className="w-auto"
          value={filters.checkedIn ?? ""}
          onChange={(e) => setFilters((f) => ({ ...f, checkedIn: (e.target.value || undefined) as GuestFilters["checkedIn"] }))}
        >
          <option value="">Check-in: any</option>
          <option value="true">Checked in</option>
          <option value="false">Not checked in</option>
        </Select>
      </div>

      {isLoading && <Spinner />}

      {!isLoading && guests?.length === 0 && (
        <EmptyState
          icon={<Users className="h-10 w-10" />}
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
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
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
                      {guest.isVip && <Badge className="bg-amber-50 text-amber-700">VIP</Badge>}
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
                      <Badge className="bg-emerald-50 text-emerald-700">Checked in</Badge>
                    ) : (
                      <span className="text-slate-400">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-1">
                      <button
                        aria-label={`Edit ${guest.firstName} ${guest.lastName}`}
                        onClick={() => setEditingGuest(guest)}
                        className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        aria-label={`Remove ${guest.firstName} ${guest.lastName}`}
                        onClick={() => handleDelete(guest)}
                        className="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <GuestFormModal open={showAddGuest} onClose={() => setShowAddGuest(false)} eventId={eventId} />
      {editingGuest && (
        <GuestFormModal open={!!editingGuest} onClose={() => setEditingGuest(undefined)} eventId={eventId} guest={editingGuest} />
      )}
      <CsvImportModal open={showImport} onClose={() => setShowImport(false)} eventId={eventId} />
    </div>
  );
}
