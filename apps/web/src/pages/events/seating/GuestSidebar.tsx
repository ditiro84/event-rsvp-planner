import { useMemo, useState } from "react";
import { Search, Star, Users } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input, Select } from "@/components/ui/Input";
import { ProgressBar } from "@/components/ui/ProgressBar";
import type { TableRecord, UnassignedGuest } from "@/types";

export function GuestSidebar({
  guests,
  tables,
  onAssign,
}: {
  guests: UnassignedGuest[];
  tables: TableRecord[];
  onAssign: (guestId: string, tableId: string) => void;
}) {
  const assignedCount = useMemo(
    () => tables.reduce((sum, t) => sum + t.seats.filter((s) => s.assignment || s.partyAssignment).length, 0),
    [tables]
  );
  const totalGuests = assignedCount + guests.length;
  const [search, setSearch] = useState("");
  // Keyboard-accessible alternative to the drag-and-drop assignment: pick a
  // guest's "Assign to table" button and choose from a native <select>. This
  // covers the exact same flow as dragging onto the canvas but needs no
  // mouse, drag events, or pointer precision.
  const [assigningId, setAssigningId] = useState<string | null>(null);
  const [pickerTableId, setPickerTableId] = useState("");

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return guests;
    return guests.filter((g) => `${g.firstName} ${g.lastName}`.toLowerCase().includes(term));
  }, [guests, search]);

  const availableTables = useMemo(
    () =>
      tables
        .map((table) => ({
          table,
          available: table.capacity - table.seats.filter((s) => s.assignment || s.partyAssignment).length,
        }))
        .filter((t) => t.available > 0),
    [tables]
  );

  function openPicker(guestId: string) {
    setAssigningId(guestId);
    setPickerTableId(availableTables[0]?.table.id ?? "");
  }

  function confirmAssign(guestId: string) {
    if (!pickerTableId) return;
    onAssign(guestId, pickerTableId);
    setAssigningId(null);
  }

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-slate-100 px-4 py-3">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold text-slate-900">Unassigned Guests</h3>
          <span className="rounded-full bg-brand-50 px-2 py-0.5 text-[11px] font-bold text-brand-700">{guests.length}</span>
        </div>
        <p className="mt-0.5 text-xs text-slate-500">drag onto a table or use Assign</p>
        <div className="relative mt-2.5">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
          <Input
            placeholder="Search..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-8 pl-8 text-xs"
          />
        </div>
      </div>
      <div className="flex-1 space-y-1.5 overflow-y-auto px-3 py-3">
        {guests.length === 0 && (
          <p className="px-1 py-6 text-center text-sm text-slate-400">Everyone confirmed has a seat.</p>
        )}
        {guests.length > 0 && filtered.length === 0 && (
          <p className="px-1 py-6 text-center text-sm text-slate-400">No guests match "{search}".</p>
        )}
        {filtered.map((guest) => (
          <div
            key={guest.id}
            draggable
            onDragStart={(e) => {
              e.dataTransfer.setData("text/plain", guest.id);
              e.dataTransfer.effectAllowed = "move";
            }}
            className="cursor-grab rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm shadow-soft transition-shadow active:cursor-grabbing hover:border-brand-300 hover:shadow-card"
          >
            <div className="flex items-center justify-between gap-2">
              <span className="font-medium text-slate-800">
                {guest.firstName} {guest.lastName}
              </span>
              {guest.isVip && <Star className="h-3.5 w-3.5 shrink-0 fill-warning-500 text-warning-500" />}
            </div>
            {guest.party.length > 0 && (
              <p className="text-xs text-slate-500">+ {guest.party.map((p) => p.fullName).join(", ")}</p>
            )}

            {assigningId === guest.id ? (
              <div className="mt-2 flex items-center gap-1.5 border-t border-slate-100 pt-2">
                <Select
                  aria-label={`Table for ${guest.firstName} ${guest.lastName}`}
                  value={pickerTableId}
                  onChange={(e) => setPickerTableId(e.target.value)}
                  className="h-7 flex-1 px-2 py-0 text-xs"
                  autoFocus
                >
                  {availableTables.length === 0 && <option value="">No seats available</option>}
                  {availableTables.map(({ table, available }) => (
                    <option key={table.id} value={table.id}>
                      {table.name} ({available} open)
                    </option>
                  ))}
                </Select>
                <Button
                  size="sm"
                  className="h-7 px-2 text-xs"
                  onClick={() => confirmAssign(guest.id)}
                  disabled={!pickerTableId}
                >
                  Seat
                </Button>
                <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={() => setAssigningId(null)}>
                  Cancel
                </Button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => openPicker(guest.id)}
                className="mt-1.5 flex items-center gap-1 text-xs font-medium text-brand-600 hover:text-brand-700"
              >
                <Users className="h-3 w-3" />
                Assign to table
              </button>
            )}
          </div>
        ))}
      </div>
      {totalGuests > 0 && (
        <div className="border-t border-slate-100 px-4 py-3">
          <div className="mb-1.5 flex items-center justify-between text-xs">
            <span className="font-medium text-slate-600">Seating Progress</span>
            <span className="text-slate-500">
              {assignedCount} / {totalGuests} assigned
            </span>
          </div>
          <ProgressBar value={assignedCount} max={totalGuests} accent="success" />
        </div>
      )}
    </div>
  );
}
