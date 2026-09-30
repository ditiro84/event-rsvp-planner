import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Copy, Mail, MessageCircle } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Textarea } from "@/components/ui/Input";
import { Spinner } from "@/components/ui/Spinner";
import { useGetInviteLink, useMarkInviteSent, useSendEditRequestEmail } from "@/hooks/useInvites";
import { getApiErrorMessage } from "@/lib/api";
import { buildWhatsAppUrl } from "@/lib/whatsapp";
import type { Guest } from "@/types";

function defaultMessage(firstName: string, eventName: string) {
  return `Hi ${firstName}, could you take another look at your RSVP for ${eventName}? Use the link below to update it.`;
}

// Sends a guest back to their own existing (already-submitted) RSVP with a
// specific ask -- e.g. "please add your +2's names" -- rather than the
// generic "you're invited" copy in InviteModal.tsx. Reuses the exact same
// personalized link, since that page already opens pre-filled and
// editable for any field, not just the one prompting this message.
export function RequestEditModal({
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
  const sendEmail = useSendEditRequestEmail(eventId);
  const markSent = useMarkInviteSent(eventId);
  const [message, setMessage] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (open) {
      setCopied(false);
      setMessage(defaultMessage(guest.firstName, eventName));
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
    const text = message.trim() ? `${message.trim()}\n${link.url}` : link.url;
    window.open(buildWhatsAppUrl(text, guest.phone), "_blank", "noopener,noreferrer");
    markSent.mutate({ guestId: guest.id, channel: "whatsapp" });
  }

  async function handleEmail() {
    if (!message.trim()) {
      toast.error("Write a message for the guest first");
      return;
    }
    try {
      await sendEmail.mutateAsync({ guestId: guest.id, message: message.trim() });
      toast.success(`Edit request emailed to ${guest.firstName}`);
    } catch (err) {
      toast.error(getApiErrorMessage(err));
    }
  }

  return (
    <Modal open={open} onClose={onClose} title={`Ask ${guest.firstName} to update their RSVP`} size="sm">
      {getLink.isPending && <Spinner />}

      {getLink.isError && (
        <p className="text-sm text-red-600">{getApiErrorMessage(getLink.error)}</p>
      )}

      {link && (
        <div className="space-y-4">
          <div>
            <label htmlFor="edit-request-message" className="text-sm font-medium text-slate-700">
              Message
            </label>
            <Textarea
              id="edit-request-message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={4}
              className="mt-1"
            />
            <p className="mt-1 text-xs text-slate-500">
              Their existing RSVP link is added automatically -- it opens pre-filled and editable, so they can fix
              any field, not just the one you mention here.
            </p>
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
        </div>
      )}
    </Modal>
  );
}
