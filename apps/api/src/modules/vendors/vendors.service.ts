import { prisma } from "../../lib/prisma";
import { NotFoundError } from "../../lib/errors";
import { getOwnedEventOrCollaborator } from "../events/events.service";
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

// Vendors can each be priced in a different currency (see Vendor.currency),
// so a single blended "total cost" number would be misleading -- this
// groups by currency instead, e.g. [{currency: "USD", total: 500}, {currency:
// "GBP", total: 120}], so the UI can show "$500.00 + £120.00" rather than
// silently summing unlike units under one $ sign.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function groupCostsByCurrency(vendors: any[]) {
  const totalsByCurrency = new Map<string, number>();
  for (const v of vendors) {
    if (v.costCents === null || v.costCents === undefined) continue;
    totalsByCurrency.set(v.currency, (totalsByCurrency.get(v.currency) ?? 0) + v.costCents);
  }
  return Array.from(totalsByCurrency.entries())
    .map(([currency, cents]) => ({ currency, total: cents / 100 }))
    .sort((a, b) => a.currency.localeCompare(b.currency));
}

export async function getOwnedVendor(userId: string, eventId: string, vendorId: string) {
  await getOwnedEventOrCollaborator(userId, eventId);
  const vendor = await prisma.vendor.findUnique({ where: { id: vendorId } });
  if (!vendor || vendor.eventId !== eventId) {
    throw new NotFoundError("Vendor not found");
  }
  return vendor;
}

export async function listVendors(userId: string, eventId: string, query: ListVendorsQuery) {
  await getOwnedEventOrCollaborator(userId, eventId);

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
  await getOwnedEventOrCollaborator(userId, eventId);

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
      currency: input.currency ?? "USD",
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
  await getOwnedEventOrCollaborator(userId, eventId);

  const vendors = await prisma.vendor.findMany({ where: { eventId } });
  const totalCostCents = vendors.reduce((sum: number, v: { costCents: number | null }) => sum + (v.costCents ?? 0), 0);
  const bookedCount = vendors.filter((v: { status: string }) => v.status === "BOOKED" || v.status === "CONFIRMED").length;

  return {
    totalVendors: vendors.length,
    bookedCount,
    // Kept for backwards compatibility (a plain sum, only meaningful if
    // every vendor shares one currency) -- costsByCurrency below is what
    // the UI actually displays.
    totalCost: totalCostCents / 100,
    costsByCurrency: groupCostsByCurrency(vendors),
  };
}
