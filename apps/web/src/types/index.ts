export type EventType =
  | "WEDDING"
  | "BIRTHDAY"
  | "CORPORATE"
  | "CONFERENCE"
  | "GRADUATION"
  | "PARTY"
  | "GALA"
  | "RELIGIOUS"
  | "CHARITY"
  | "OTHER";

export type RsvpStatus = "PENDING" | "CONFIRMED" | "DECLINED" | "MAYBE";

export type PublicEventCategory =
  | "NIGHTLIFE"
  | "BOAT_CRUISE"
  | "CONCERT"
  | "FESTIVAL"
  | "COMEDY_SHOW"
  | "PRIVATE_PARTY"
  | "OTHER";

export type CurrencyCode = "USD" | "GBP" | "NGN";

export type UserRole = "PLANNER" | "ADMIN";

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  createdAt: string;
}

export interface EventRecord {
  id: string;
  userId: string;
  name: string;
  type: EventType;
  description: string | null;
  date: string;
  startTime: string | null;
  endTime: string | null;
  venueName: string | null;
  venueAddress: string | null;
  capacity: number | null;
  imageUrl: string | null;
  rsvpToken: string;
  rsvpOpen: boolean;
  rsvpDeadline: string | null;
  customMessage: string | null;
  allowPlusOnes: boolean;
  allowPlusOneNames: boolean;
  allowMealSelection: boolean;
  allowDietary: boolean;
  allowAccessibilityInfo: boolean;
  allowSpecialRequests: boolean;
  merchandiseEnabled: boolean;
  // Public ticketing listing (separate from the private RSVP flow above).
  isPublic: boolean;
  publicCategory: PublicEventCategory | null;
  publicSlug: string | null;
  publicDescription: string | null;
  minAge: number | null;
  hasCoverImage: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface EventGuestSummary {
  totalGuests: number;
  confirmed: number;
  pending: number;
  declined: number;
  maybe: number;
  assignedGuests: number;
  totalTables: number;
}

// The shape returned by GET /events (list) -- an EventRecord plus a
// lightweight guestSummary used to render progress on My Events cards.
// GET /events/:id (single) still returns a plain EventRecord.
export interface EventListItem extends EventRecord {
  guestSummary: EventGuestSummary;
}

export interface TicketTypeRecord {
  id: string;
  eventId: string;
  name: string;
  description: string | null;
  price: number;
  currency: CurrencyCode;
  quantityTotal: number | null;
  quantitySold: number;
  quantityRemaining: number | null;
  salesStartAt: string | null;
  salesEndAt: string | null;
  minPerOrder: number;
  maxPerOrder: number;
  sortOrder: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

// --- Public ticket page (guest-facing, /tickets/:slug) --------------------

export interface PublicTicketType {
  id: string;
  name: string;
  description: string | null;
  price: number;
  currency: CurrencyCode;
  quantityRemaining: number | null;
  minPerOrder: number;
  maxPerOrder: number;
  onSale: boolean;
}

export interface PublicTicketEventInfo {
  id: string;
  name: string;
  publicSlug: string;
  publicCategory: PublicEventCategory | null;
  publicDescription: string | null;
  minAge: number | null;
  date: string;
  startTime: string | null;
  endTime: string | null;
  venueName: string | null;
  venueAddress: string | null;
  hasCoverImage: boolean;
}

export interface PublicTicketEventListing {
  event: PublicTicketEventInfo;
  ticketTypes: PublicTicketType[];
  paymentOptionsByCurrency: Record<string, PayoutProvider[]>;
}

export interface PublicTicketOrderTicket {
  id: string;
  code: string;
  status: "VALID" | "CHECKED_IN" | "CANCELLED";
  ticketTypeName: string;
  attendeeName: string | null;
}

export interface PublicTicketOrder {
  id: string;
  status: "PENDING" | "PAID" | "CANCELLED";
  guestName: string;
  guestEmail: string;
  total: number;
  currency: CurrencyCode;
  tickets: PublicTicketOrderTicket[];
}

export interface EventDashboardStats {
  totalGuests: number;
  confirmed: number;
  declined: number;
  pending: number;
  maybe: number;
  totalExpectedAttendees: number;
  totalTables: number;
  assignedGuests: number;
  unassignedConfirmedGuests: number;
  vegetarian: number;
  vegan: number;
  withDietaryRequirements: number;
  withAccessibilityRequirements: number;
  checkedIn: number;
  vip: number;
}

export interface GuestPartyMember {
  id: string;
  fullName: string;
  mealPreference: string | null;
  dietaryRequirements: string | null;
}

export interface SeatAssignmentSummary {
  table: { name: string };
  seat: { seatNumber: number } | null;
}

export interface Guest {
  id: string;
  eventId: string;
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string | null;
  groupName: string | null;
  rsvpStatus: RsvpStatus;
  rsvpRespondedAt: string | null;
  additionalGuestsCount: number;
  mealPreference: string | null;
  dietaryRequirements: string | null;
  accessibilityRequirements: string | null;
  specialNotes: string | null;
  isVip: boolean;
  checkedIn: boolean;
  checkedInAt: string | null;
  createdAt: string;
  updatedAt: string;
  party?: GuestPartyMember[];
  seatAssignment?: SeatAssignmentSummary | null;
}

export interface RsvpDashboard {
  rsvpOpen: boolean;
  rsvpDeadline: string | null;
  rsvpLink: string;
  stats: {
    totalInvited: number;
    confirmed: number;
    declined: number;
    pending: number;
    maybe: number;
    totalExpectedAttendees: number;
  };
  nonResponders: { id: string; firstName: string; lastName: string; email: string | null; phone: string | null }[];
}

export interface PublicEvent {
  id: string;
  // Always the shared event-level token, even when this page was reached via
  // a personalized invite link -- used to key the guest-facing shop, which
  // isn't per-guest.
  rsvpToken: string;
  name: string;
  type: EventType;
  date: string;
  startTime: string | null;
  endTime: string | null;
  venueName: string | null;
  venueAddress: string | null;
  imageUrl: string | null;
  customMessage: string | null;
  rsvpOpen: boolean;
  rsvpDeadline: string | null;
  allowPlusOnes: boolean;
  allowPlusOneNames: boolean;
  allowMealSelection: boolean;
  allowDietary: boolean;
  allowAccessibilityInfo: boolean;
  allowSpecialRequests: boolean;
  hasInvitationCard: boolean;
}

// ---------------------------------------------------------------------------
// Seating planner
// ---------------------------------------------------------------------------

export type LayoutObjectType =
  | "STAGE"
  | "DANCE_FLOOR"
  | "BAR"
  | "BUFFET"
  | "ENTRANCE"
  | "EXIT"
  | "TOILETS"
  | "DJ_BOOTH"
  | "VIP_AREA"
  | "CUSTOM";

export type TableShape = "ROUND" | "SQUARE" | "RECTANGLE" | "OVAL" | "BANQUET" | "HEAD" | "CUSTOM";

export interface LayoutObjectRecord {
  id: string;
  venueLayoutId: string;
  type: LayoutObjectType;
  label: string | null;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  color: string | null;
}

export interface VenueLayoutRecord {
  id: string;
  eventId: string;
  name: string;
  canvasWidth: number;
  canvasHeight: number;
  gridSize: number;
  backgroundColor: string;
  objects: LayoutObjectRecord[];
}

export interface SeatGuestSummary {
  id: string;
  firstName: string;
  lastName: string;
  rsvpStatus: RsvpStatus;
  isVip: boolean;
  additionalGuestsCount: number;
}

export interface SeatPartyAssignmentSummary {
  id: string;
  partyMemberId: string;
  partyMember: { id: string; fullName: string; guestId: string };
}

export interface SeatRecord {
  id: string;
  tableId: string;
  seatNumber: number;
  x: number;
  y: number;
  assignment: { id: string; guestId: string; guest: SeatGuestSummary } | null;
  partyAssignment: SeatPartyAssignmentSummary | null;
}

export interface TableRecord {
  id: string;
  eventId: string;
  name: string;
  shape: TableShape;
  capacity: number;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  seats: SeatRecord[];
}

export interface UnassignedGuest {
  id: string;
  firstName: string;
  lastName: string;
  additionalGuestsCount: number;
  isVip: boolean;
  mealPreference: string | null;
  party: { id: string; fullName: string }[];
}

export interface SeatingMap {
  layout: VenueLayoutRecord;
  tables: TableRecord[];
  unassignedGuests: UnassignedGuest[];
}

// ---------------------------------------------------------------------------
// Invites
// ---------------------------------------------------------------------------

export interface InviteLink {
  url: string;
  qrDataUrl: string;
  channel: string | null;
  sentAt: string | null;
  guestEmail: string | null;
  guestPhone: string | null;
  hasInvitationCard: boolean;
}

export interface GuestPrefill {
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string | null;
}

// ---------------------------------------------------------------------------
// Vendors
// ---------------------------------------------------------------------------

export type VendorCategory =
  | "CATERING"
  | "VENUE"
  | "PHOTOGRAPHY"
  | "VIDEOGRAPHY"
  | "FLORAL"
  | "MUSIC_ENTERTAINMENT"
  | "DECOR"
  | "RENTALS"
  | "TRANSPORTATION"
  | "BEAUTY"
  | "STATIONERY"
  | "OTHER";

export type VendorStatus = "CONTACTED" | "QUOTE_RECEIVED" | "BOOKED" | "CONFIRMED" | "CANCELLED";

export interface VendorRecord {
  id: string;
  eventId: string;
  name: string;
  category: VendorCategory;
  status: VendorStatus;
  contactName: string | null;
  email: string | null;
  phone: string | null;
  website: string | null;
  cost: number | null;
  currency: CurrencyCode;
  depositPaid: boolean;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CurrencyTotal {
  currency: CurrencyCode;
  total: number;
}

export interface VendorSummary {
  totalVendors: number;
  bookedCount: number;
  totalCost: number;
  costsByCurrency: CurrencyTotal[];
}

// ---------------------------------------------------------------------------
// Notifications
// ---------------------------------------------------------------------------

export type NotificationType = "RSVP_CONFIRMED" | "RSVP_DECLINED" | "VENDOR_STATUS_CHANGED" | "ORDER_PAID" | "SYSTEM";

export interface NotificationRecord {
  id: string;
  userId: string;
  eventId: string | null;
  type: NotificationType;
  title: string;
  body: string | null;
  link: string | null;
  read: boolean;
  readAt: string | null;
  createdAt: string;
}

// ---------------------------------------------------------------------------
// Needs Attention insights
// ---------------------------------------------------------------------------

export type InsightSeverity = "ACTION_REQUIRED" | "UPDATE";

export interface InsightRecord {
  id: string;
  eventId: string;
  eventName: string;
  severity: InsightSeverity;
  title: string;
  description: string;
  link: string;
}

// ---------------------------------------------------------------------------
// Analytics
// ---------------------------------------------------------------------------

export interface AnalyticsByEvent {
  eventId: string;
  eventName: string;
  date: string;
  totalGuests: number;
  confirmed: number;
  declined: number;
  pending: number;
  maybe: number;
  checkedIn: number;
}

export interface AnalyticsOverview {
  totalEvents: number;
  upcomingEvents: number;
  pastEvents: number;
  totalGuests: number;
  confirmed: number;
  declined: number;
  pending: number;
  maybe: number;
  confirmationRate: number;
  responseRate: number;
  checkedIn: number;
  checkInRate: number;
  totalVendors: number;
  vendorsBooked: number;
  totalVendorSpend: number;
  vendorSpendByCurrency: CurrencyTotal[];
  byEvent: AnalyticsByEvent[];
}

// ---------------------------------------------------------------------------
// Merchandise (event shop)
// ---------------------------------------------------------------------------

export interface ProductRecord {
  id: string;
  eventId: string;
  name: string;
  description: string | null;
  price: number;
  currency: CurrencyCode;
  stockQuantity: number | null;
  active: boolean;
  hasImage: boolean;
  soldCount: number;
  createdAt: string;
  updatedAt: string;
}

export type OrderStatus = "PENDING" | "PAID" | "CANCELLED";

export interface OrderItemRecord {
  productName: string;
  unitPrice: number;
  quantity: number;
}

export interface OrderRecord {
  id: string;
  eventId: string;
  guestId: string | null;
  guestName: string;
  guestEmail: string;
  status: OrderStatus;
  total: number;
  deliveryMethod: string;
  createdAt: string;
  items: OrderItemRecord[];
}

export interface OrdersSummary {
  totalSales: number;
  orderCount: number;
  itemsSold: number;
}

export interface PublicShopProduct {
  id: string;
  name: string;
  description: string | null;
  price: number;
  currency: CurrencyCode;
  stockQuantity: number | null;
  hasImage: boolean;
}

export interface PublicShopListing {
  enabled: boolean;
  products: PublicShopProduct[];
  // Which processors are connected and ready to accept payment, per
  // currency -- e.g. { USD: ["STRIPE_CONNECT", "PAYPAL"], NGN: ["PAYSTACK"] }.
  // A currency missing here (or with an empty array) has nothing connected
  // yet, so checkout for it should be disabled in the UI.
  paymentOptionsByCurrency: Partial<Record<CurrencyCode, PayoutProvider[]>>;
}

// ---------------------------------------------------------------------------
// Payouts (multi-processor payments marketplace)
// ---------------------------------------------------------------------------

export type PayoutProvider = "STRIPE_CONNECT" | "PAYSTACK" | "PAYPAL";

export interface PayoutAccountRecord {
  id: string;
  currency: CurrencyCode;
  provider: PayoutProvider;
  // Whether this account can actually receive payments yet -- for Stripe
  // Connect that means onboarding finished, for Paystack/PayPal it means
  // the account details were saved successfully.
  connected: boolean;
  stripeOnboardingComplete?: boolean;
  paystackBankName?: string;
  paystackAccountLast4?: string;
  paypalEmail?: string;
  createdAt: string;
  updatedAt: string;
}

export interface PaystackBank {
  name: string;
  code: string;
}

// ---------------------------------------------------------------------------
// Admin / support tooling
// ---------------------------------------------------------------------------

export interface AdminUserSummary {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  createdAt: string;
  eventCount: number;
}

export interface AdminEventSummary {
  id: string;
  name: string;
  type: EventType;
  date: string;
  createdAt: string;
  owner: { id: string; name: string; email: string };
  guestCount: number;
  orderCount: number;
}

export interface AdminAuditLogEntry {
  id: string;
  adminUserId: string;
  adminEmail: string;
  eventId: string | null;
  eventName: string | null;
  method: string;
  summary: string;
  createdAt: string;
}

export type PaymentEventStatus = "SUCCESS" | "FAILED" | "EXPIRED" | "INFO";

export interface PaymentEventEntry {
  id: string;
  eventId: string | null;
  eventName: string | null;
  orderId: string | null;
  guestName?: string | null;
  guestEmail?: string | null;
  orderStatus?: OrderStatus | null;
  provider: PayoutProvider | null;
  type: string;
  status: PaymentEventStatus;
  amount: number | null;
  currency: CurrencyCode | null;
  message: string | null;
  rawPayload?: string;
  createdAt: string;
}

// ---------------------------------------------------------------------------
// Public content (blog articles + landing page Services)
// ---------------------------------------------------------------------------

export type ArticleStatus = "DRAFT" | "PUBLISHED";

export interface Article {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  body: string;
  hasCoverImage: boolean;
  status: ArticleStatus;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
  author?: { id: string; name: string; email: string };
}

// Matches SERVICE_ICONS in apps/api/src/modules/landing/landing.schema.ts --
// keep in sync.
export const SERVICE_ICON_OPTIONS = [
  "Sparkles",
  "Users",
  "Calendar",
  "CreditCard",
  "Shield",
  "Globe",
  "Camera",
  "Gift",
  "Headphones",
  "Star",
  "Store",
  "Mail",
  "Armchair",
  "ClipboardCheck",
] as const;
export type ServiceIcon = (typeof SERVICE_ICON_OPTIONS)[number];

export interface LandingService {
  id: string;
  title: string;
  description: string;
  icon: ServiceIcon;
  sortOrder: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface PlatformAnalytics {
  totalSubscribers: number;
  totalEvents: number;
  totalGuests: number;
  rsvpConfirmed: number;
  confirmationRate: number;
  totalOrdersPaid: number;
  revenueByCurrencyAndProvider: {
    currency: CurrencyCode;
    provider: PayoutProvider | null;
    orderCount: number;
    totalRevenue: number;
    platformFee: number;
  }[];
  trend: { date: string; signups: number; events: number }[];
}
