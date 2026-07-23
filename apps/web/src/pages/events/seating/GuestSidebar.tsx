import { useMemo, useState } from "react";
import { Search, Star } from "lucide-react";
import { Input } from "@/components/ui/Input";
import type { UnassignedGuest } from "@/types";

export function GuestSidebar({ guests }: { guests: UnassignedGuest[] }) {
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return guests;
    return guests.filter((g) => `${g.firstName} ${g.lastName}`.toLowerCase().includes(term));
  }, [guests, search]);

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-slate-100 px-4 py-3">
        <h3 className="text-sm font-semibold text-slate-900">Unseated guests</h3>
        <p className="text-xs text-slate-500">{guests.length} confirmed, drag onto a table</p>
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
              <p className="text-xs text-slate-500">
                + {guest.party.map((p) => p.fullName).join(", ")}
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
