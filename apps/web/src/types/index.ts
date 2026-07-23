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
  createdAt: string;
  updatedAt: string;
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
