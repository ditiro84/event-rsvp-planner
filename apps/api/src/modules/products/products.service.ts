import { prisma } from "../../lib/prisma";
import { BadRequestError, NotFoundError } from "../../lib/errors";
import { getOwnedEvent } from "../events/events.service";
import { CreateProductInput, UpdateProductInput } from "./products.schema";

const ALLOWED_IMAGE_TYPES = new Set(["image/png", "image/jpeg", "image/webp"]);
const MAX_IMAGE_BYTES = 5 * 1024 * 1024; // 5MB

export interface UploadedFile {
  buffer: Buffer;
  mimetype: string;
  size: number;
}

// NOTE: typed as `any` here because this sandbox could not run `prisma generate`
// (see DEPLOYMENT.md); once generated, this can be tightened back to proper
// Prisma types.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function toCents(amount: number | null | undefined): number | null | undefined {
  if (amount === null) return null;
  if (amount === undefined) return undefined;
  return Math.round(amount * 100);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function serializeProduct(product: any, soldByProductId?: Map<string, number>) {
  return {
    id: product.id,
    eventId: product.eventId,
    name: product.name,
    description: product.description,
    price: product.priceCents / 100,
    stockQuantity: product.stockQuantity,
    active: product.active,
    hasImage: !!product.imageMimeType,
    soldCount: soldByProductId?.get(product.id) ?? 0,
    createdAt: product.createdAt,
    updatedAt: product.updatedAt,
  };
}

// Paid-order quantities sold per product, for the "N sold" footer on each
// product card -- computed from OrderItem rather than stored on Product so
// it's always consistent with actual order history.
async function getSoldCounts(eventId: string) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rows: any[] = await prisma.orderItem.findMany({
    where: { order: { eventId, status: "PAID" } },
    select: { productId: true, quantity: true },
  });
  const map = new Map<string, number>();
  for (const row of rows) {
    if (!row.productId) continue;
    map.set(row.productId, (map.get(row.productId) ?? 0) + row.quantity);
  }
  return map;
}

export async function getOwnedProduct(userId: string, eventId: string, productId: string) {
  await getOwnedEvent(userId, eventId);
  const product = await prisma.product.findUnique({ where: { id: productId } });
  if (!product || product.eventId !== eventId) {
    throw new NotFoundError("Product not found");
  }
  return product;
}

export async function listProducts(userId: string, eventId: string) {
  await getOwnedEvent(userId, eventId);
  const [products, soldByProductId] = await Promise.all([
    prisma.product.findMany({ where: { eventId }, orderBy: { createdAt: "asc" } }),
    getSoldCounts(eventId),
  ]);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return products.map((p: any) => serializeProduct(p, soldByProductId));
}

export async function createProduct(userId: string, eventId: string, input: CreateProductInput) {
  await getOwnedEvent(userId, eventId);
  const product = await prisma.product.create({
    data: {
      eventId,
      name: input.name,
      description: input.description || null,
      priceCents: toCents(input.price)!,
      stockQuantity: input.stockQuantity ?? null,
      active: input.active ?? true,
    },
  });
  return serializeProduct(product);
}

export async function updateProduct(userId: string, eventId: string, productId: string, input: UpdateProductInput) {
  await getOwnedProduct(userId, eventId, productId);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const data: any = { ...input };
  delete data.price;
  if ("price" in input) data.priceCents = toCents(input.price);

  const product = await prisma.product.update({ where: { id: productId }, data });
  return serializeProduct(product);
}

export async function deleteProduct(userId: string, eventId: string, productId: string) {
  await getOwnedProduct(userId, eventId, productId);
  await prisma.product.delete({ where: { id: productId } });
}

export async function uploadProductImage(userId: string, eventId: string, productId: string, file: UploadedFile) {
  await getOwnedProduct(userId, eventId, productId);

  if (!ALLOWED_IMAGE_TYPES.has(file.mimetype)) {
    throw new BadRequestError("Product image must be a PNG, JPEG, or WEBP file");
  }
  if (file.size > MAX_IMAGE_BYTES) {
    throw new BadRequestError("Product image must be 5MB or smaller");
  }

  const product = await prisma.product.update({
    where: { id: productId },
    data: { imageData: file.buffer, imageMimeType: file.mimetype },
  });
  return serializeProduct(product);
}

// Internal (no auth) -- used by both the authenticated host download route
// and the public guest-facing shop image route.
export async function getProductImageBytes(productId: string) {
  const product = await prisma.product.findUnique({
    where: { id: productId },
    select: { imageData: true, imageMimeType: true },
  });
  if (!product || !product.imageData || !product.imageMimeType) {
    throw new NotFoundError("This product has no image");
  }
  return { data: product.imageData, mimeType: product.imageMimeType };
}

// --- Public (guest-facing) reads --------------------------------------------

export async function listPublicProducts(rsvpToken: string) {
  const event = await prisma.event.findUnique({
    where: { rsvpToken },
    select: { id: true, merchandiseEnabled: true },
  });
  if (!event) throw new NotFoundError("This RSVP link is invalid");
  if (!event.merchandiseEnabled) return { enabled: false, products: [] };

  const products = await prisma.product.findMany({
    where: { eventId: event.id, active: true },
    orderBy: { createdAt: "asc" },
  });

  return {
    enabled: true,
    products: products
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .filter((p: any) => p.stockQuantity === null || p.stockQuantity > 0)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .map((p: any) => ({
        id: p.id,
        name: p.name,
        description: p.description,
        price: p.priceCents / 100,
        stockQuantity: p.stockQuantity,
        hasImage: !!p.imageMimeType,
      })),
  };
}
