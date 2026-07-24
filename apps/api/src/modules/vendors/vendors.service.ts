import { prisma } from "../../lib/prisma";
import { NotFoundError } from "../../lib/errors";
import { getOwnedEvent } from "../events/events.service";
import { notifyVendorStatusChanged } from "../notifications/notifications.service";
import { CreateVendorInput, ListVendorsQuery, UpdateVendorInput } from "./vendors.schema";

// NOTE: typed as `any` here because this sandbox could not run `prisma generate`
// (see DEPLOYMENT.md); once generated, this can be tightened back to proper
// Prisma types.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function toCents(dollars: number | null | undefined): number | null | undefined {
  if (dollars === null) return null;
  if (dollars === undefined) return undefined;
  return Math.round(dollars * 100);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function serializeVendor(vendor: any) {
  return {
    ...vendor,
    cost: vendor.costCents === null || vendor.costCents === undefined ? null : vendor.costCents / 100,
  };
}

export async function getOwnedVendor(userId: string, eventId: string, vendorId: string) {
  await getOwnedEvent(userId, eventId);
  const vendor = await prisma.vendor.findUnique({ where: { id: vendorId } });
  if (!vendor || vendor.eventId !== eventId) {
    throw new NotFoundError("Vendor not found");
  }
  return vendor;
}

export async function listVendors(userId: string, eventId: string, query: ListVendorsQuery) {
  await getOwnedEvent(userId, eventId);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const where: any = { eventId };
  if (query.status) where.status = query.status;
  if (query.category) where.category = query.category;

  const vendors = await prisma.vendor.findMany({
    where,
    orderBy: [{ createdAt: "desc" }],
  });
  return vendors.map(serializeVendor);
}

export async function createVendor(userId: string, eventId: string, input: CreateVendorInput) {
  await getOwnedEvent(userId, eventId);

  const vendor = await prisma.vendor.create({
    data: {
      eventId,
      name: input.name,
      category: input.category,
      status: input.status,
      contactName: input.contactName || null,
      email: input.email || null,
      phone: input.phone || null,
      website: input.website || null,
      costCents: toCents(input.cost) ?? null,
      depositPaid: input.depositPaid ?? false,
      notes: input.notes || null,
    },
  });
  return serializeVendor(vendor);
}

export async function updateVendor(
  userId: string,
  eventId: string,
  vendorId: string,
  input: UpdateVendorInput
) {
  const existing = await getOwnedVendor(userId, eventId, vendorId);

  const previousStatus = existing.status;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const data: any = { ...input };
  delete data.cost;
  if ("cost" in input) data.costCents = toCents(input.cost);
  if ("email" in input && input.email === "") data.email = null;

  const vendor = await prisma.vendor.update({ where: { id: vendorId }, data });

  if (input.status && input.status !== previousStatus) {
    await notifyVendorStatusChanged(userId, vendor);
  }

  return serializeVendor(vendor);
}

export async function deleteVendor(userId: string, eventId: string, vendorId: string) {
  await getOwnedVendor(userId, eventId, vendorId);
  await prisma.vendor.delete({ where: { id: vendorId } });
}

// Rolled up per-event vendor totals, used on the Vendors tab summary strip.
export async function getVendorSummary(userId: string, eventId: string) {
  await getOwnedEvent(userId, eventId);

  const vendors = await prisma.vendor.findMany({ where: { eventId } });
  const totalCostCents = vendors.reduce((sum: number, v: { costCents: number | null }) => sum + (v.costCents ?? 0), 0);
  const bookedCount = vendors.filter((v: { status: string }) => v.status === "BOOKED" || v.status === "CONFIRMED").length;

  return {
    totalVendors: vendors.length,
    bookedCount,
    totalCost: totalCostCents / 100,
  };
}
