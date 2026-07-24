import type { CurrencyCode, CurrencyTotal } from "@/types";

export function formatDate(value: string | null | undefined) {
  if (!value) return "—";
  return new Date(value).toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" });
}

export function formatDateShort(value: string | null | undefined) {
  if (!value) return "—";
  return new Date(value).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

export function formatDateTimeLocalInput(value: string | null | undefined) {
  if (!value) return "";
  const d = new Date(value);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function formatDateInput(value: string | null | undefined) {
  if (!value) return "";
  return new Date(value).toISOString().slice(0, 10);
}

export function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// --- Currency -----------------------------------------------------------
// Money amounts across the app (merchandise prices, vendor costs) support
// three currencies -- the planner picks one per record; there's no live FX
// conversion, it's just which symbol/code is stored and displayed. Where a
// figure aggregates several records (e.g. total vendor spend), it's broken
// down per currency rather than blended into one misleading number -- see
// formatMoneyBreakdown.
export const CURRENCIES: { code: CurrencyCode; symbol: string; label: string }[] = [
  { code: "USD", symbol: "$", label: "US Dollar" },
  { code: "GBP", symbol: "£", label: "British Pound" },
  { code: "NGN", symbol: "₦", label: "Nigerian Naira" },
];

const CURRENCY_SYMBOLS: Record<CurrencyCode, string> = {
  USD: "$",
  GBP: "£",
  NGN: "₦",
};

export function formatMoney(amount: number, currency: CurrencyCode = "USD") {
  const symbol = CURRENCY_SYMBOLS[currency] ?? "$";
  return `${symbol}${amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

// Renders a per-currency total list as e.g. "$500.00 + £120.00". Returns a
// plain "—" when there's nothing to show, and skips the "+"-joining when
// there's only one currency (the common case).
export function formatMoneyBreakdown(totals: CurrencyTotal[]) {
  if (totals.length === 0) return "—";
  return totals.map((t) => formatMoney(t.total, t.currency)).join(" + ");
}

export const EVENT_TYPE_LABELS: Record<string, string> = {
  WEDDING: "Wedding",
  BIRTHDAY: "Birthday",
  CORPORATE: "Corporate Event",
  CONFERENCE: "Conference",
  GRADUATION: "Graduation",
  PARTY: "Party",
  GALA: "Gala Dinner",
  RELIGIOUS: "Religious Event",
  CHARITY: "Charity Event",
  OTHER: "Other",
};

// Compact "time ago" label for notifications/alerts (e.g. "10 minutes ago",
// "2 hours ago", falling back to a short date once it's more than a week).
export function formatRelativeTime(value: string | null | undefined) {
  if (!value) return "";
  const date = new Date(value);
  const diffMs = Date.now() - date.getTime();
  const diffSec = Math.round(diffMs / 1000);
  if (diffSec < 60) return "just now";
  const diffMin = Math.round(diffSec / 60);
  if (diffMin < 60) return `${diffMin} minute${diffMin === 1 ? "" : "s"} ago`;
  const diffHour = Math.round(diffMin / 60);
  if (diffHour < 24) return `${diffHour} hour${diffHour === 1 ? "" : "s"} ago`;
  const diffDay = Math.round(diffHour / 24);
  if (diffDay < 7) return `${diffDay} day${diffDay === 1 ? "" : "s"} ago`;
  return formatDateShort(value);
}
