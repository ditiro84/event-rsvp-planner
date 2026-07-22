import { parse } from "csv-parse/sync";
import { stringify } from "csv-stringify/sync";
import { BadRequestError } from "../../lib/errors";
import { CreateGuestInput, createGuestSchema } from "./guests.schema";

const IMPORT_COLUMNS = [
  "firstName",
  "lastName",
  "email",
  "phone",
  "groupName",
  "isVip",
  "mealPreference",
  "dietaryRequirements",
  "accessibilityRequirements",
  "specialNotes",
] as const;

export function parseGuestsCsv(buffer: Buffer): CreateGuestInput[] {
  let records: Record<string, string>[];
  try {
    records = parse(buffer, {
      columns: (header: string[]) => header.map((h) => h.trim()),
      skip_empty_lines: true,
      trim: true,
    });
  } catch (err) {
    throw new BadRequestError("Could not parse CSV file. Check the file format.", {
      reason: (err as Error).message,
    });
  }

  if (records.length === 0) {
    throw new BadRequestError("CSV file has no data rows");
  }
  if (records.length > 5000) {
    throw new BadRequestError("CSV file has too many rows (max 5000 per import)");
  }

  const errors: { row: number; message: string }[] = [];
  const guests: CreateGuestInput[] = [];

  records.forEach((raw, idx) => {
    const candidate = {
      firstName: raw.firstName ?? raw["First Name"] ?? "",
      lastName: raw.lastName ?? raw["Last Name"] ?? "",
      email: raw.email ?? raw["Email"] ?? "",
      phone: raw.phone ?? raw["Phone"] ?? "",
      groupName: raw.groupName ?? raw["Group"] ?? "",
      isVip: ["true", "yes", "1"].includes(String(raw.isVip ?? raw["VIP"] ?? "").toLowerCase()),
      mealPreference: raw.mealPreference ?? raw["Meal Preference"] ?? "",
      dietaryRequirements: raw.dietaryRequirements ?? raw["Dietary Requirements"] ?? "",
      accessibilityRequirements:
        raw.accessibilityRequirements ?? raw["Accessibility Requirements"] ?? "",
      specialNotes: raw.specialNotes ?? raw["Notes"] ?? "",
    };
    const parsed = createGuestSchema.safeParse(candidate);
    if (!parsed.success) {
      errors.push({ row: idx + 2, message: parsed.error.issues.map((i) => i.message).join("; ") });
      return;
    }
    guests.push(parsed.data);
  });

  if (errors.length > 0) {
    throw new BadRequestError("Some rows in the CSV file are invalid", { errors });
  }

  return guests;
}

interface ExportableGuest {
  firstName: string;
  lastName: string;
  email: string | null;
  rsvpStatus: string;
  mealPreference: string | null;
  dietaryRequirements: string | null;
  accessibilityRequirements: string | null;
  checkedIn: boolean;
  isVip: boolean;
  seatAssignment: { table: { name: string }; seat: { seatNumber: number } | null } | null;
}

export function guestsToCsv(guests: ExportableGuest[]): string {
  const rows = guests.map((g) => ({
    "First Name": g.firstName,
    "Last Name": g.lastName,
    Email: g.email ?? "",
    "RSVP Status": g.rsvpStatus,
    Table: g.seatAssignment?.table.name ?? "",
    Seat: g.seatAssignment?.seat ? String(g.seatAssignment.seat.seatNumber) : "",
    "Meal Preference": g.mealPreference ?? "",
    "Dietary Requirements": g.dietaryRequirements ?? "",
    "Accessibility Requirements": g.accessibilityRequirements ?? "",
    VIP: g.isVip ? "Yes" : "No",
    "Checked In": g.checkedIn ? "Yes" : "No",
  }));
  return stringify(rows, { header: true });
}

export const CSV_IMPORT_TEMPLATE_HEADER = IMPORT_COLUMNS.join(",");
