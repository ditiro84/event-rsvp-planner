import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Copy, Mail, MessageCircle } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Spinner } from "@/components/ui/Spinner";
import { useGetInviteLink, useMarkInviteSent, useSendInviteEmail } from "@/hooks/useInvites";
import { getApiErrorMessage } from "@/lib/api";
import { formatDate } from "@/lib/format";
import type { Guest } from "@/types";

// Builds a wa.me "click to chat" link -- no WhatsApp Business API or
// credentials needed, the host just taps it and WhatsApp opens with the
// message pre-filled, ready to send.
function buildWhatsAppUrl(phone: string, message: string) {
  const digits = phone.replace(/[^\d]/g, "");
  return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;
}

export function InviteModal({
  open,
  onClose,
  eventId,
  eventName,
  guest,
}: {
  open: boolean;
  onClose: () => void;
  eventId: string;
  eventName: string;
  guest: Guest;
}) {
  const getLink = useGetInviteLink(eventId);
  const sendEmail = useSendInviteEmail(eventId);
  const markSent = useMarkInviteSent(eventId);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (open) {
      setCopied(false);
      getLink.mutate(guest.id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, guest.id]);

  const link = getLink.data;

  async function handleCopy() {
    if (!link) return;
    await navigator.clipboard.writeText(link.url);
    setCopied(true);
    toast.success("Link copied");
  }

  function handleWhatsApp() {
    if (!link || !guest.phone) return;
    const message = `You're invited to ${eventName}! RSVP here: ${link.url}`;
    window.open(buildWhatsAppUrl(guest.phone, message), "_blank", "noopener,noreferrer");
    markSent.mutate({ guestId: guest.id, channel: "whatsapp" });
  }

  async function handleEmail() {
    try {
      await sendEmail.mutateAsync(guest.id);
      toast.success(`Invite emailed to ${guest.firstName}`);
      getLink.mutate(guest.id);
    } catch (err) {
      toast.error(getApiErrorMessage(err));
    }
  }

  return (
    <Modal open={open} onClose={onClose} title={`Invite ${guest.firstName} ${guest.lastName}`} size="sm">
      {getLink.isPending && <Spinner />}

      {getLink.isError && (
        <p className="text-sm text-red-600">{getApiErrorMessage(getLink.error)}</p>
      )}

      {link && (
        <div className="space-y-4">
          <div className="flex justify-center">
            <img src={link.qrDataUrl} alt="Invite QR code" className="h-44 w-44 rounded-lg border border-slate-200" />
          </div>

          <div className="flex items-center gap-2">
            <input
              readOnly
              value={link.url}
              className="min-w-0 flex-1 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600"
              onFocus={(e) => e.currentTarget.select()}
            />
            <Button type="button" variant="secondary" size="sm" onClick={handleCopy}>
              <Copy className="h-4 w-4" />
              {copied ? "Copied" : "Copy"}
            </Button>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <Button
              type="button"
              variant="secondary"
              onClick={handleWhatsApp}
              disabled={!guest.phone}
              title={guest.phone ? undefined : "Add a phone number for this guest first"}
            >
              <MessageCircle className="h-4 w-4" />
              WhatsApp
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={handleEmail}
              isLoading={sendEmail.isPending}
              disabled={!guest.email}
              title={guest.email ? undefined : "Add an email address for this guest first"}
            >
              <Mail className="h-4 w-4" />
              Email
            </Button>
          </div>

          {link.sentAt && (
            <p className="text-center text-xs text-slate-400">
              Last sent via {link.channel ?? "unknown"} on {formatDate(link.sentAt)}
            </p>
          )}
        </div>
      )}
    </Modal>
  );
}
