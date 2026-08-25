import { useCallback, useState } from "react";
import { toast } from "sonner";
import { AlertTriangle, Check, QrCode, X } from "lucide-react";
import { useTicketScan, type ScannedTicket } from "@/hooks/useTicketTypes";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { QrScanner } from "@/components/ui/QrScanner";
import { EmptyState } from "@/components/ui/EmptyState";
import { getApiErrorMessage } from "@/lib/api";

// Door check-in for public ticket sales -- scans a Ticket's own `code` QR
// (shown to the buyer on their confirmation screen), separate from the
// private-event guest wristband scanner in CheckInTab.tsx. Collapsed by
// default since most planners using the Tickets tab are still setting up
// ticket types, not standing at the door yet.
export function TicketScanPanel({ eventId }: { eventId: string }) {
  const [active, setActive] = useState(false);
  const [lastScan, setLastScan] = useState<{ ticket: ScannedTicket; alreadyCheckedIn: boolean } | null>(null);
  const scan = useTicketScan(eventId);

  const handleScan = useCallback(
    (rawValue: string) => {
      const code = rawValue.trim();
      scan.mutate(code, {
        onSuccess: (result) => {
          setLastScan(result);
          if (result.alreadyCheckedIn) {
            toast.warning(`${result.ticket.ticketTypeName} ticket was already checked in`);
          } else {
            toast.success(`${result.ticket.ticketTypeName} ticket checked in`);
          }
        },
        onError: (err) => toast.error(getApiErrorMessage(err)),
      });
    },
    [scan]
  );

  if (!active) {
    return (
      <Card className="flex flex-wrap items-center justify-between gap-3 p-5">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-50 text-brand-600">
            <QrCode className="h-5 w-5" />
          </span>
          <div>
            <p className="font-semibold text-slate-900">Door check-in</p>
            <p className="text-sm text-slate-500">Scan a ticket's QR code to check attendees in at the door.</p>
          </div>
        </div>
        <Button variant="secondary" size="sm" onClick={() => setActive(true)}>
          <QrCode className="h-4 w-4" />
          Start scanning
        </Button>
      </Card>
    );
  }

  return (
    <Card className="p-5">
      <div className="mb-4 flex items-center justify-between">
        <p className="font-semibold text-slate-900">Door check-in</p>
        <button
          onClick={() => {
            setActive(false);
            setLastScan(null);
          }}
          aria-label="Stop scanning"
          className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <div>
          <QrScanner active={active} onScan={handleScan} />
          <p className="mt-2 text-center text-xs text-slate-400">Point the camera at a ticket's QR code.</p>
        </div>

        <div>
          {!lastScan ? (
            <EmptyState
              icon={<QrCode className="h-6 w-6" />}
              title="Waiting for a scan"
              description="Scanned tickets show up here."
            />
          ) : (
            <div className="rounded-xl2 border border-slate-200 p-5">
              <div className="flex items-center justify-between gap-2">
                <p className="font-bold text-slate-900">{lastScan.ticket.ticketTypeName}</p>
                {lastScan.alreadyCheckedIn ? (
                  <Badge variant="warning">
                    <AlertTriangle className="mr-1 h-3 w-3" />
                    Already used
                  </Badge>
                ) : (
                  <Badge variant="success">
                    <Check className="mr-1 h-3 w-3" />
                    Checked in
                  </Badge>
                )}
              </div>
              <p className="mt-1 text-sm text-slate-500">{lastScan.ticket.attendeeName || "Ticket holder"}</p>
              <p className="mt-3 font-mono text-xs text-slate-400">{lastScan.ticket.code}</p>
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}
