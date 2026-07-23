// Builds a "Display Name <address>" From header so each event's invite shows
// up in the guest's inbox as coming from that event, not a generic app
// address. Strips characters that would break the header (quotes, angle
// brackets, line breaks) rather than trying to fully escape them.
export function formatFromHeader(displayName: string, address: string) {
  const safeName = displayName.replace(/["<>\r\n]/g, "").trim();
  return safeName ? `${safeName} <${address}>` : address;
}
