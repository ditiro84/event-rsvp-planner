import { prisma } from "../../lib/prisma";
import { BadRequestError, NotFoundError } from "../../lib/errors";
import { getOwnedEventOrCollaborator } from "../events/events.service";
import { resolveSizeOptions } from "../../utils/merchandiseSizing";
import { CreateBundleInput, UpdateBundleInput } from "./bundles.schema";

// NOTE: `any` throughout for the same reason as products.service.ts: the
// sandbox can't run `prisma generate`, so relation types aren't available.

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function serializeBundle(bundle: any) {
  return {
    id: bundle.id,
    eventId: bundle.eventId,
    name: bundle.name,
    description: bundle.description,
    price: bundle.priceCents / 100,
    currency: bundle.currency,
    active: bundle.active,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    items: (bundle.items ?? []).map((i: any) => ({
      productId: i.productId,
      productName: i.product?.name ?? "",
      quantity: i.quantity,
      fitType: i.product?.fitType ?? "NONE",
      sizeOptions: i.product?.fitType === "SIZE_CHART" ? resolveSizeOptions(i.product?.sizeOptions) : null,
      // What the same products cost bought separately, so the planner (and
      // guests) can see the saving.
      unitPrice: (i.product?.priceCents ?? 0) / 100,
    })),
    createdAt: bundle.createdAt,
    updatedAt: bundle.updatedAt,
  };
}

const bundleInclude = { items: { include: { product: true }, orderBy: { id: "asc" as const } } };

// Every product must belong to this event, and they must all price in one
// currency: a bundle is bought as a single line, and an order can only settle
// in one currency. The bundle takes that currency.
async function resolveItems(eventId: string, items: { productId: string; quantity: number }[]) {
  const merged = new Map<string, number>();
  for (const item of items) merged.set(item.productId, (merged.get(item.productId) ?? 0) + item.quantity);

  const products = await prisma.product.findMany({ where: { id: { in: Array.from(merged.keys()) }, eventId } });
  if (products.length !== merged.size) {
    throw new BadRequestError("One of the products in this bundle doesn't exist on this event");
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const currencies = new Set(products.map((p: any) => p.currency));
  if (currencies.size > 1) {
    throw new BadRequestError("Every product in a bundle must be priced in the same currency");
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const currency = (products[0] as any).currency;
  return { rows: Array.from(merged.entries()).map(([productId, quantity]) => ({ productId, quantity })), currency };
}

export async function getOwnedBundle(userId: string, eventId: string, bundleId: string) {
  await getOwnedEventOrCollaborator(userId, eventId);
  const bundle = await prisma.productBundle.findUnique({ where: { id: bundleId }, include: bundleInclude });
  if (!bundle || bundle.eventId !== eventId) throw new NotFoundError("Bundle not found");
  return bundle;
}

export async function listBundles(userId: string, eventId: string) {
  await getOwnedEventOrCollaborator(userId, eventId);
  const bundles = await prisma.productBundle.findMany({
    where: { eventId },
    include: bundleInclude,
    orderBy: { createdAt: "asc" },
  });
  return bundles.map(serializeBundle);
}

export async function createBundle(userId: string, eventId: string, input: CreateBundleInput) {
  await getOwnedEventOrCollaborator(userId, eventId);
  const { rows, currency } = await resolveItems(eventId, input.items);
  const bundle = await prisma.productBundle.create({
    data: {
      eventId,
      name: input.name,
      description: input.description || null,
      priceCents: Math.round(input.price * 100),
      currency,
      active: input.active ?? true,
      items: { create: rows },
    },
    include: bundleInclude,
  });
  return serializeBundle(bundle);
}

export async function updateBundle(userId: string, eventId: string, bundleId: string, input: UpdateBundleInput) {
  await getOwnedBundle(userId, eventId, bundleId);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const data: any = {};
  if (input.name !== undefined) data.name = input.name;
  if ("description" in input) data.description = input.description || null;
  if (input.price !== undefined) data.priceCents = Math.round(input.price * 100);
  if (input.active !== undefined) data.active = input.active;

  if (input.items) {
    const { rows, currency } = await resolveItems(eventId, input.items);
    data.currency = currency;
    data.items = { deleteMany: {}, create: rows };
  }

  const bundle = await prisma.productBundle.update({ where: { id: bundleId }, data, include: bundleInclude });
  return serializeBundle(bundle);
}

export async function deleteBundle(userId: string, eventId: string, bundleId: string) {
  await getOwnedBundle(userId, eventId, bundleId);
  await prisma.productBundle.delete({ where: { id: bundleId } });
}

// Guest-facing: active bundles whose products are all active and in stock for
// at least one bundle's worth.
export async function listPublicBundles(eventId: string) {
  const bundles = await prisma.productBundle.findMany({
    where: { eventId, active: true },
    include: bundleInclude,
    orderBy: { createdAt: "asc" },
  });
  return bundles
    .filter((b: any) => // eslint-disable-line @typescript-eslint/no-explicit-any
      b.items.length > 0 &&
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      b.items.every((i: any) => i.product.active && (i.product.stockQuantity === null || i.product.stockQuantity >= i.quantity))
    )
    .map(serializeBundle);
}
