// Builds a wa.me "click to chat" link -- no WhatsApp Business API or
// credentials needed, the host just taps it and WhatsApp opens with the
// message pre-filled, ready to send. Shared between InviteModal.tsx (a
// specific guest's phone number, so it opens straight into that chat) and
// RsvpTab.tsx's general "Share RSVP Link" button (no particular guest, so
// phone is omitted and WhatsApp opens its own contact/group picker for the
// host to choose who to send it to).
export function buildWhatsAppUrl(message: string, phone?: string) {
  const digits = phone?.replace(/[^\d]/g, "") ?? "";
  return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;
}
