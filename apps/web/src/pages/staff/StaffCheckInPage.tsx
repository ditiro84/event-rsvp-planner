import { useCallback, useState } from "react";
import { useParams } from "react-router-dom";
import { toast } from "sonner";
import { AlertTriangle, Check, QrCode, ShieldOff, Sparkles, Ticket, UserCheck } from "lucide-react";
import { useStaffPassContext, useStaffScanGuest, useStaffScanTicket } from "@/hooks/useStaffPasses";
import { Badge } from "@/components/ui/Badge";
import { QrScanner } from "@/components/ui/QrScanner";
import { EmptyState } from "@/components/ui/EmptyState";
import { Spinner } from "@/components/ui/Spinner";
import { cn } from "@/lib/cn";
import { formatDate } from "@/lib/format";
import { getApiErrorMessage } from "@/lib/api";
import type { Guest } from "@/types";
import type { ScannedTicket } from "@/hooks/useTicketTypes";

// A scanned QR either encodes the full invite URL (.../rsvp/invite/<token>)
// or a bare token -- same convention as CheckInTab.tsx's guest scanner.
function extractInviteToken(rawValue: string): string {
  const trimmed = rawValue.trim();
  const parts = trimmed.split("/").filter(Boolean);
  return parts[parts.length - 1] ?? trimmed;
}

function StatusScreen({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-canvas px-4 text-center">
      <div className="max-w-sm rounded-xl2 border border-slate-200 bg-white p-8 shadow-card">
        {icon}
        <h1 className="mt-4 font-display text-xl font-semibold text-slate-900">{title}</h1>
        <p className="mt-2 text-sm text-slate-500">{description}</p>
      </div>
    </div>
  );
}

// The public, no-account door check-in kiosk for a single named
// EventStaffPass -- see staffPasses.public.routes.ts. Deliberately scoped to
// scanning only (guest wristbands and ticket QRs): a staff pass exists for
// day-of check-in duty, not for browsing the guest list, seating, or any
// other tab a real EventCollaborator account would see.
export default function StaffCheckInPage() {
  const { passToken } = useParams<{ passToken: string }>();
  const { data: context, isLoading, isError } = useStaffPassContext(passToken);
  const [mode, setMode] = useState<"guest" | "ticket">("guest");
  const [lastGuest, setLastGuest] = useState<Guest | null>(null);
  const [lastTicket, setLastTicket] = useState<{ ticket: ScannedTicket; alreadyCheckedIn: boolean } | null>(null);
  const scanGuest = useStaffScanGuest(passToken ?? "");
  const scanTicket = useStaffScanTicket(passToken ?? "");

  const handleGuestScan = useCallback(
    (rawValue: string) => {
      const token = extractInviteToken(rawValue);
      scanGuest.mutate(token, {
        onSuccess: (guest) => {
          setLastGuest(guest);
          toast.success(`${guest.firstName} ${guest.lastName} checked in`);
        },
        onError: (err) => toast.error(getApiErrorMessage(err)),
      });
    },
    [scanGuest]
  );

  const handleTicketScan = useCallback(
    (rawValue: string) => {
      scanTicket.mutate(rawValue.trim(), {
        onSuccess: (result) => {
          setLastTicket(result);
          if (result.alreadyCheckedIn) {
            toast.warning(`${result.ticket.ticketTypeName} ticket was already checked in`);
          } else {
            toast.success(`${result.ticket.ticketTypeName} ticket checked in`);
          }
        },
        onError: (err) => toast.error(getApiErrorMessage(err)),
      });
    },
    [scanTicket]
  );

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-canvas">
        <Spinner />
      </div>
    );
  }

  if (isError || !context) {
    return (
      <StatusScreen
        icon={<ShieldOff className="mx-auto h-10 w-10 text-danger-500" />}
        title="This staff link is no longer active"
        description="Ask the event planner for a new check-in link."
      />
    );
  }

  function handleModeChange(next: "guest" | "ticket") {
    setMode(next);
    setLastGuest(null);
    setLastTicket(null);
  }

  return (
    <div className="min-h-screen bg-canvas px-4 py-8">
      <div className="mx-auto max-w-md">
        <div className="mb-6 flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-600">
            <Sparkles className="h-4 w-4 text-white" />
          </span>
          <span className="font-display text-xl font-bold text-slate-950">Gadaova</span>
        </div>

        <div className="mb-6 rounded-xl2 border border-slate-200 bg-white p-5 shadow-card">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Door check-in pass</p>
          <h1 className="mt-1 text-lg font-bold text-slate-900">{context.eventName}</h1>
          <p className="mt-0.5 text-sm text-slate-500">
            {formatDate(context.eventDate)}
            {context.venueName ? ` -- ${context.venueName}` : ""}
          </p>
          <div className="mt-3 flex items-center gap-2 border-t border-slate-100 pt-3">
            <span className="text-sm text-slate-500">Signed in as</span>
            <Badge variant="coral">{context.passName}</Badge>
          </div>
        </div>

        <div className="mb-4 inline-flex w-full items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 p-1">
          <button
            onClick={() => handleModeChange("guest")}
            className={cn(
              "flex flex-1 items-center justify-center gap-1.5 rounded-md px-3 py-2 text-sm font-semibold transition-colors",
              mode === "guest" ? "bg-white text-brand-700 shadow-soft" : "text-slate-500 hover:text-slate-800"
            )}
          >
            <UserCheck className="h-4 w-4" />
            Guest Wristband
          </button>
          <button
            onClick={() => handleModeChange("ticket")}
            className={cn(
              "flex flex-1 items-center justify-center gap-1.5 rounded-md px-3 py-2 text-sm font-semibold transition-colors",
              mode === "ticket" ? "bg-white text-brand-700 shadow-soft" : "text-slate-500 hover:text-slate-800"
            )}
          >
            <Ticket className="h-4 w-4" />
            Ticket
          </button>
        </div>

        <QrScanner active onScan={mode === "guest" ? handleGuestScan : handleTicketScan} />
        <p className="mt-2 text-center text-xs text-slate-400">
          {mode === "guest" ? "Point the camera at a guest's wristband, badge, or invite QR code." : "Point the camera at a ticket's QR code."}
        </p>

        <div className="mt-5">
          {mode === "guest" ? (
            !lastGuest ? (
              <EmptyState icon={<QrCode className="h-6 w-6" />} title="Waiting for a scan" description="Scanned guests show up here." />
            ) : (
              <div className="rounded-xl2 border border-slate-200 bg-white p-5 shadow-card">
                <div className="flex items-center justify-between gap-2">
                  <p className="font-bold text-slate-900">
                    {lastGuest.firstName} {lastGuest.lastName}
                  </p>
                  <Badge variant="success">
                    <Check className="mr-1 h-3 w-3" />
                    Checked in
                  </Badge>
                </div>
                <p className="mt-1 text-sm text-slate-500">
                  {lastGuest.seatAssignment
                    ? `${lastGuest.seatAssignment.table.name}${
                        lastGuest.seatAssignment.seat ? `, Seat ${lastGuest.seatAssignment.seat.seatNumber}` : ""
                      }`
                    : "No table assigned"}
                </p>
              </div>
            )
          ) : !lastTicket ? (
            <EmptyState icon={<QrCode className="h-6 w-6" />} title="Waiting for a scan" description="Scanned tickets show up here." />
          ) : (
            <div className="rounded-xl2 border border-slate-200 bg-white p-5 shadow-card">
              <div className="flex items-center justify-between gap-2">
                <p className="font-bold text-slate-900">{lastTicket.ticket.ticketTypeName}</p>
                {lastTicket.alreadyCheckedIn ? (
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
              <p className="mt-1 text-sm text-slate-500">{lastTicket.ticket.attendeeName || "Ticket holder"}</p>
              <p className="mt-3 font-mono text-xs text-slate-400">{lastTicket.ticket.code}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
