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

export interface User {
  id: string;
  name: string;
  email: string;
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
  depositPaid: boolean;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface VendorSummary {
  totalVendors: number;
  bookedCount: number;
  totalCost: number;
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
  stockQuantity: number | null;
  hasImage: boolean;
}

export interface PublicShopListing {
  enabled: boolean;
  products: PublicShopProduct[];
}
