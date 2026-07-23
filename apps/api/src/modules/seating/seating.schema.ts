import { z } from "zod";

export const tableShapeEnum = z.enum(["ROUND", "SQUARE", "RECTANGLE", "OVAL", "BANQUET", "HEAD", "CUSTOM"]);
export const layoutObjectTypeEnum = z.enum([
  "STAGE",
  "DANCE_FLOOR",
  "BAR",
  "BUFFET",
  "ENTRANCE",
  "EXIT",
  "TOILETS",
  "DJ_BOOTH",
  "VIP_AREA",
  "CUSTOM",
]);

export const updateLayoutSchema = z.object({
  name: z.string().trim().min(1).max(120).optional(),
  canvasWidth: z.coerce.number().int().min(400).max(10000).optional(),
  canvasHeight: z.coerce.number().int().min(400).max(10000).optional(),
  gridSize: z.coerce.number().int().min(5).max(200).optional(),
  backgroundColor: z
    .string()
    .trim()
    .regex(/^#[0-9a-fA-F]{6}$/, "Must be a hex color like #f8fafc")
    .optional(),
});
export type UpdateLayoutInput = z.infer<typeof updateLayoutSchema>;

export const createLayoutObjectSchema = z.object({
  type: layoutObjectTypeEnum.default("CUSTOM"),
  label: z.string().trim().max(80).optional().nullable(),
  x: z.coerce.number().default(0),
  y: z.coerce.number().default(0),
  width: z.coerce.number().positive().max(5000).default(100),
  height: z.coerce.number().positive().max(5000).default(100),
  rotation: z.coerce.number().default(0),
  color: z
    .string()
    .trim()
    .regex(/^#[0-9a-fA-F]{6}$/)
    .optional()
    .nullable(),
});
export type CreateLayoutObjectInput = z.infer<typeof createLayoutObjectSchema>;

export const updateLayoutObjectSchema = createLayoutObjectSchema.partial();
export type UpdateLayoutObjectInput = z.infer<typeof updateLayoutObjectSchema>;

export const createTableSchema = z.object({
  name: z.string().trim().min(1, "Table name is required").max(80),
  shape: tableShapeEnum.default("ROUND"),
  capacity: z.coerce.number().int().min(1).max(40).default(8),
  x: z.coerce.number().default(0),
  y: z.coerce.number().default(0),
  width: z.coerce.number().positive().max(2000).default(120),
  height: z.coerce.number().positive().max(2000).default(120),
  rotation: z.coerce.number().default(0),
});
export type CreateTableInput = z.infer<typeof createTableSchema>;

export const updateTableSchema = createTableSchema.partial();
export type UpdateTableInput = z.infer<typeof updateTableSchema>;

export const assignGuestSchema = z.object({
  guestId: z.string().min(1),
  tableId: z.string().min(1),
  seatId: z.string().min(1).optional(),
  overrideCapacity: z.boolean().optional(),
});
export type AssignGuestInput = z.infer<typeof assignGuestSchema>;

export const objectIdParamsSchema = z.object({
  eventId: z.string().min(1),
  objectId: z.string().min(1),
});

export const tableIdParamsSchema = z.object({
  eventId: z.string().min(1),
  tableId: z.string().min(1),
});

export const assignmentGuestIdParamsSchema = z.object({
  eventId: z.string().min(1),
  guestId: z.string().min(1),
});

export const assignmentPartyMemberIdParamsSchema = z.object({
  eventId: z.string().min(1),
  partyMemberId: z.string().min(1),
});
