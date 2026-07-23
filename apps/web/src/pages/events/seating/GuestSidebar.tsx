import { Star } from "lucide-react";
import type { UnassignedGuest } from "@/types";

export function GuestSidebar({ guests }: { guests: UnassignedGuest[] }) {
  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-slate-100 px-4 py-3">
        <h3 className="text-sm font-semibold text-slate-900">Unseated guests</h3>
        <p className="text-xs text-slate-500">{guests.length} confirmed, drag onto a table</p>
      </div>
      <div className="flex-1 space-y-1.5 overflow-y-auto px-3 py-3">
        {guests.length === 0 && (
          <p className="px-1 py-6 text-center text-sm text-slate-400">Everyone confirmed has a seat.</p>
        )}
        {guests.map((guest) => (
          <div
            key={guest.id}
            draggable
            onDragStart={(e) => {
              e.dataTransfer.setData("text/plain", guest.id);
              e.dataTransfer.effectAllowed = "move";
            }}
            className="cursor-grab rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm active:cursor-grabbing hover:border-brand-300 hover:shadow"
          >
            <div className="flex items-center justify-between gap-2">
              <span className="font-medium text-slate-800">
                {guest.firstName} {guest.lastName}
              </span>
              {guest.isVip && <Star className="h-3.5 w-3.5 shrink-0 fill-amber-400 text-amber-400" />}
            </div>
            {guest.additionalGuestsCount > 0 && (
              <p className="text-xs text-slate-500">+{guest.additionalGuestsCount} in party</p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
