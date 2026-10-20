import { beforeEach, describe, expect, it } from "vitest";
import request from "supertest";
import { buildTestApp, resetDatabase } from "../helpers/testApp";
import { registerAndLogin } from "../helpers/authHelpers";

const app = buildTestApp();

beforeEach(async () => {
  await resetDatabase();
});

async function createEventWithToken(token: string) {
  const res = await request(app)
    .post("/api/events")
    .set("Authorization", `Bearer ${token}`)
    .send({ name: "Test Event", date: "2026-10-01" });
  return res.body.data.event.id as string;
}

describe("Products", () => {
  it("creates a product with a price and rounds cents correctly", async () => {
    const { token } = await registerAndLogin(app);
    const eventId = await createEventWithToken(token);
    const auth = { Authorization: `Bearer ${token}` };

    const res = await request(app)
      .post(`/api/events/${eventId}/products`)
      .set(auth)
      .send({ name: "Guest Favour Box", price: 12.5, stockQuantity: 50 });

    expect(res.status).toBe(201);
    expect(res.body.data.product.name).toBe("Guest Favour Box");
    expect(res.body.data.product.price).toBe(12.5);
    expect(res.body.data.product.stockQuantity).toBe(50);
    expect(res.body.data.product.active).toBe(true);
    expect(res.body.data.product.soldCount).toBe(0);
  });

  it("lists products for an event", async () => {
    const { token } = await registerAndLogin(app);
    const eventId = await createEventWithToken(token);
    const auth = { Authorization: `Bearer ${token}` };

    await request(app).post(`/api/events/${eventId}/products`).set(auth).send({ name: "Product A", price: 10 });
    await request(app).post(`/api/events/${eventId}/products`).set(auth).send({ name: "Product B", price: 20 });

    const res = await request(app).get(`/api/events/${eventId}/products`).set(auth);
    expect(res.status).toBe(200);
    expect(res.body.data.products).toHaveLength(2);
  });

  it("updates and deletes a product", async () => {
    const { token } = await registerAndLogin(app);
    const eventId = await createEventWithToken(token);
    const auth = { Authorization: `Bearer ${token}` };

    const created = await request(app)
      .post(`/api/events/${eventId}/products`)
      .set(auth)
      .send({ name: "Wine Bottle", price: 35 });
    const productId = created.body.data.product.id;

    const updated = await request(app)
      .put(`/api/events/${eventId}/products/${productId}`)
      .set(auth)
      .send({ price: 40, active: false });
    expect(updated.status).toBe(200);
    expect(updated.body.data.product.price).toBe(40);
    expect(updated.body.data.product.active).toBe(false);

    const del = await request(app).delete(`/api/events/${eventId}/products/${productId}`).set(auth);
    expect(del.status).toBe(204);

    const list = await request(app).get(`/api/events/${eventId}/products`).set(auth);
    expect(list.body.data.products).toHaveLength(0);
  });

  it("rejects access to another planner's products", async () => {
    const { token } = await registerAndLogin(app);
    const planner2 = await registerAndLogin(app);
    const eventId = await createEventWithToken(token);
    const auth = { Authorization: `Bearer ${token}` };

    await request(app).post(`/api/events/${eventId}/products`).set(auth).send({ name: "Product A", price: 10 });

    const res = await request(app)
      .get(`/api/events/${eventId}/products`)
      .set("Authorization", `Bearer ${planner2.token}`);
    expect(res.status).toBe(404);
  });
});

describe("Public shop", () => {
  it("hides products until the shop is enabled", async () => {
    const { token } = await registerAndLogin(app);
    const eventId = await createEventWithToken(token);
    const auth = { Authorization: `Bearer ${token}` };

    await request(app).post(`/api/events/${eventId}/products`).set(auth).send({ name: "Product A", price: 10 });
    const eventRes = await request(app).get(`/api/events/${eventId}`).set(auth);
    const rsvpToken = eventRes.body.data.event.rsvpToken;

    const shop = await request(app).get(`/api/shop/${rsvpToken}/products`);
    expect(shop.status).toBe(200);
    expect(shop.body.data.enabled).toBe(false);
    expect(shop.body.data.products).toHaveLength(0);
  });

  it("lists active, in-stock products once the shop is enabled", async () => {
    const { token } = await registerAndLogin(app);
    const eventId = await createEventWithToken(token);
    const auth = { Authorization: `Bearer ${token}` };

    await request(app).put(`/api/events/${eventId}`).set(auth).send({ merchandiseEnabled: true });
    await request(app).post(`/api/events/${eventId}/products`).set(auth).send({ name: "In stock", price: 10, stockQuantity: 3 });
    await request(app).post(`/api/events/${eventId}/products`).set(auth).send({ name: "Sold out", price: 10, stockQuantity: 0 });
    await request(app).post(`/api/events/${eventId}/products`).set(auth).send({ name: "Hidden", price: 10, active: false });

    const eventRes = await request(app).get(`/api/events/${eventId}`).set(auth);
    const rsvpToken = eventRes.body.data.event.rsvpToken;

    const shop = await request(app).get(`/api/shop/${rsvpToken}/products`);
    expect(shop.status).toBe(200);
    expect(shop.body.data.enabled).toBe(true);
    expect(shop.body.data.products).toHaveLength(1);
    expect(shop.body.data.products[0].name).toBe("In stock");
  });

  it("records a manual order when no payout account is connected for the cart's currency", async () => {
    const { token } = await registerAndLogin(app);
    const eventId = await createEventWithToken(token);
    const auth = { Authorization: `Bearer ${token}` };

    await request(app).put(`/api/events/${eventId}`).set(auth).send({ merchandiseEnabled: true });
    const product = await request(app)
      .post(`/api/events/${eventId}/products`)
      .set(auth)
      .send({ name: "Product A", price: 10 });
    const productId = product.body.data.product.id;

    const eventRes = await request(app).get(`/api/events/${eventId}`).set(auth);
    const rsvpToken = eventRes.body.data.event.rsvpToken;

    // No EventPayoutAccount is connected (see payouts.test.ts), so the order
    // is captured as MANUAL for the planner to collect payment themselves.
    const checkout = await request(app)
      .post(`/api/shop/${rsvpToken}/checkout`)
      .send({ guestName: "Jane Guest", guestEmail: "jane@example.com", items: [{ productId, quantity: 1 }] });

    expect(checkout.status).toBe(200);
    expect(checkout.body.data.checkoutUrl).toBeNull();
    expect(checkout.body.data.order.status).toBe("MANUAL");
  });

  it("rejects checkout with an empty cart", async () => {
    const { token } = await registerAndLogin(app);
    const eventId = await createEventWithToken(token);
    const auth = { Authorization: `Bearer ${token}` };
    await request(app).put(`/api/events/${eventId}`).set(auth).send({ merchandiseEnabled: true });

    const eventRes = await request(app).get(`/api/events/${eventId}`).set(auth);
    const rsvpToken = eventRes.body.data.event.rsvpToken;

    const checkout = await request(app)
      .post(`/api/shop/${rsvpToken}/checkout`)
      .send({ guestName: "Jane Guest", guestEmail: "jane@example.com", items: [] });

    expect(checkout.status).toBe(400);
  });
});

describe("Orders", () => {
  it("lists no orders and zeroed summary for a fresh event", async () => {
    const { token } = await registerAndLogin(app);
    const eventId = await createEventWithToken(token);
    const auth = { Authorization: `Bearer ${token}` };

    const list = await request(app).get(`/api/events/${eventId}/orders`).set(auth);
    expect(list.status).toBe(200);
    expect(list.body.data.orders).toHaveLength(0);

    const summary = await request(app).get(`/api/events/${eventId}/orders/summary`).set(auth);
    expect(summary.status).toBe(200);
    expect(summary.body.data).toEqual({ totalSales: 0, orderCount: 0, itemsSold: 0 });
  });
});

describe("Sizing and measurements", () => {
  async function shopWithProducts() {
    const { token } = await registerAndLogin(app);
    const eventId = await createEventWithToken(token);
    const auth = { Authorization: `Bearer ${token}` };
    await request(app).put(`/api/events/${eventId}`).set(auth).send({ merchandiseEnabled: true });
    const tee = await request(app)
      .post(`/api/events/${eventId}/products`)
      .set(auth)
      .send({ name: "Event Tee", price: 20, fitType: "SIZE_CHART", sizeOptions: ["S", "M", "L"] });
    const cap = await request(app)
      .post(`/api/events/${eventId}/products`)
      .set(auth)
      .send({ name: "Event Cap", price: 15, fitType: "HEAD_CIRCUMFERENCE" });
    const fabric = await request(app)
      .post(`/api/events/${eventId}/products`)
      .set(auth)
      .send({ name: "Aso Ebi Fabric", price: 50 });
    const eventRes = await request(app).get(`/api/events/${eventId}`).set(auth);
    return {
      auth,
      eventId,
      rsvpToken: eventRes.body.data.event.rsvpToken as string,
      teeId: tee.body.data.product.id as string,
      capId: cap.body.data.product.id as string,
      fabricId: fabric.body.data.product.id as string,
    };
  }

  const guest = { guestName: "Jane Guest", guestEmail: "jane@example.com" };

  it("offers the default sizes when a T-shirt has no custom list, and the planner's list when set", async () => {
    const { auth, eventId, rsvpToken, teeId } = await shopWithProducts();
    const shop = await request(app).get(`/api/shop/${rsvpToken}/products`);
    const tee = shop.body.data.products.find((p: { id: string }) => p.id === teeId);
    expect(tee.fitType).toBe("SIZE_CHART");
    expect(tee.sizeOptions).toEqual(["S", "M", "L"]);

    await request(app).put(`/api/events/${eventId}/products/${teeId}`).set(auth).send({ sizeOptions: null });
    const after = await request(app).get(`/api/shop/${rsvpToken}/products`);
    expect(after.body.data.products.find((p: { id: string }) => p.id === teeId).sizeOptions).toEqual([
      "XS",
      "S",
      "M",
      "L",
      "XL",
      "XXL",
    ]);
  });

  it("requires a valid size for T-shirts", async () => {
    const { rsvpToken, teeId } = await shopWithProducts();
    const missing = await request(app)
      .post(`/api/shop/${rsvpToken}/checkout`)
      .send({ ...guest, items: [{ productId: teeId, quantity: 1 }] });
    expect(missing.status).toBe(400);
    expect(missing.body.error.message).toMatch(/Choose a size/);

    const invalid = await request(app)
      .post(`/api/shop/${rsvpToken}/checkout`)
      .send({ ...guest, items: [{ productId: teeId, quantity: 1, selectedSize: "XXL" }] });
    expect(invalid.status).toBe(400);

    const ok = await request(app)
      .post(`/api/shop/${rsvpToken}/checkout`)
      .send({ ...guest, items: [{ productId: teeId, quantity: 2, selectedSize: "m" }] });
    expect(ok.status).toBe(200);
    expect(ok.body.data.order.items[0].selectedSize).toBe("M");
  });

  it("records cap head circumference in both units and rejects implausible values", async () => {
    const { rsvpToken, capId } = await shopWithProducts();

    const tooSmall = await request(app)
      .post(`/api/shop/${rsvpToken}/checkout`)
      .send({ ...guest, items: [{ productId: capId, quantity: 1, headCircumference: { value: 20, unit: "cm" } }] });
    expect(tooSmall.status).toBe(400);

    const missing = await request(app)
      .post(`/api/shop/${rsvpToken}/checkout`)
      .send({ ...guest, items: [{ productId: capId, quantity: 1 }] });
    expect(missing.status).toBe(400);

    const ok = await request(app)
      .post(`/api/shop/${rsvpToken}/checkout`)
      .send({ ...guest, items: [{ productId: capId, quantity: 1, headCircumference: { value: 22, unit: "in" } }] });
    expect(ok.status).toBe(200);
    const item = ok.body.data.order.items[0];
    expect(item.measurements.headCircumference).toEqual({ value: 22, unit: "in", cm: 55.9 });
    expect(item.sizeLabel).toBe("Head 22 in (55.9 cm)");
  });

  it("asks nothing for fabric and other unsized products", async () => {
    const { rsvpToken, fabricId } = await shopWithProducts();
    const res = await request(app)
      .post(`/api/shop/${rsvpToken}/checkout`)
      .send({ ...guest, items: [{ productId: fabricId, quantity: 1 }] });
    expect(res.status).toBe(200);
    expect(res.body.data.order.items[0].selectedSize).toBeNull();
    expect(res.body.data.order.items[0].measurements).toBeNull();
  });

  it("exports orders as a CSV with sizes and head measurements", async () => {
    const { auth, eventId, rsvpToken, teeId, capId } = await shopWithProducts();
    await request(app)
      .post(`/api/shop/${rsvpToken}/checkout`)
      .send({
        ...guest,
        guestName: "=SUM(1+1)",
        items: [
          { productId: teeId, quantity: 1, selectedSize: "L" },
          { productId: capId, quantity: 1, headCircumference: { value: 56, unit: "cm" } },
        ],
      });

    const res = await request(app).get(`/api/events/${eventId}/orders/export`).set(auth);
    expect(res.status).toBe(200);
    expect(res.headers["content-type"]).toMatch(/text\/csv/);
    expect(res.text).toMatch(/Event Tee,,1,L/);
    expect(res.text).toMatch(/Event Cap,,1,,56,56 cm/);
    // A guest name that looks like a formula is neutralised.
    expect(res.text).toMatch(/'=SUM\(1\+1\)/);
  });
});

describe("Bundles", () => {
  async function shopWithProducts() {
    const { token } = await registerAndLogin(app);
    const eventId = await createEventWithToken(token);
    const auth = { Authorization: `Bearer ${token}` };
    await request(app).put(`/api/events/${eventId}`).set(auth).send({ merchandiseEnabled: true });
    const cap = await request(app)
      .post(`/api/events/${eventId}/products`)
      .set(auth)
      .send({ name: "Cap", price: 15, fitType: "HEAD_CIRCUMFERENCE", stockQuantity: 5 });
    const tee = await request(app)
      .post(`/api/events/${eventId}/products`)
      .set(auth)
      .send({ name: "Tee", price: 25, fitType: "SIZE_CHART", sizeOptions: ["S", "M"], stockQuantity: 5 });
    const gbp = await request(app)
      .post(`/api/events/${eventId}/products`)
      .set(auth)
      .send({ name: "Pound product", price: 10, currency: "GBP" });
    const eventRes = await request(app).get(`/api/events/${eventId}`).set(auth);
    return {
      auth,
      eventId,
      rsvpToken: eventRes.body.data.event.rsvpToken as string,
      capId: cap.body.data.product.id as string,
      teeId: tee.body.data.product.id as string,
      gbpId: gbp.body.data.product.id as string,
    };
  }

  async function createBundle(
    ctx: { auth: Record<string, string>; eventId: string },
    body: Record<string, unknown>
  ) {
    return request(app).post(`/api/events/${ctx.eventId}/bundles`).set(ctx.auth).send(body);
  }

  const guest = { guestName: "Jane Guest", guestEmail: "jane@example.com" };

  it("lets the planner create, change and delete a bundle of any products", async () => {
    const ctx = await shopWithProducts();
    const created = await createBundle(ctx, {
      name: "Fan pack",
      price: 30,
      items: [
        { productId: ctx.capId, quantity: 1 },
        { productId: ctx.teeId, quantity: 1 },
      ],
    });
    expect(created.status).toBe(201);
    expect(created.body.data.bundle.price).toBe(30);
    expect(created.body.data.bundle.currency).toBe("USD");
    expect(created.body.data.bundle.items).toHaveLength(2);

    const bundleId = created.body.data.bundle.id as string;
    const updated = await request(app)
      .put(`/api/events/${ctx.eventId}/bundles/${bundleId}`)
      .set(ctx.auth)
      .send({ items: [{ productId: ctx.teeId, quantity: 2 }], price: 40 });
    expect(updated.status).toBe(200);
    expect(updated.body.data.bundle.items).toHaveLength(1);
    expect(updated.body.data.bundle.items[0].quantity).toBe(2);
    expect(updated.body.data.bundle.price).toBe(40);

    const list = await request(app).get(`/api/events/${ctx.eventId}/bundles`).set(ctx.auth);
    expect(list.body.data.bundles).toHaveLength(1);

    expect((await request(app).delete(`/api/events/${ctx.eventId}/bundles/${bundleId}`).set(ctx.auth)).status).toBe(204);
    const after = await request(app).get(`/api/events/${ctx.eventId}/bundles`).set(ctx.auth);
    expect(after.body.data.bundles).toHaveLength(0);
  });

  it("rejects bundles that mix currencies or are empty", async () => {
    const ctx = await shopWithProducts();
    const mixed = await createBundle(ctx, {
      name: "Mixed",
      price: 20,
      items: [{ productId: ctx.capId }, { productId: ctx.gbpId }],
    });
    expect(mixed.status).toBe(400);
    const empty = await createBundle(ctx, { name: "Empty", price: 20, items: [] });
    expect(empty.status).toBe(400);
  });

  it("shows active bundles to guests and hides them when a product is inactive", async () => {
    const ctx = await shopWithProducts();
    const created = await createBundle(ctx, {
      name: "Fan pack",
      price: 30,
      items: [{ productId: ctx.capId }, { productId: ctx.teeId }],
    });
    const shop = await request(app).get(`/api/shop/${ctx.rsvpToken}/products`);
    expect(shop.body.data.bundles).toHaveLength(1);
    expect(shop.body.data.bundles[0].name).toBe("Fan pack");

    await request(app).put(`/api/events/${ctx.eventId}/products/${ctx.teeId}`).set(ctx.auth).send({ active: false });
    const hidden = await request(app).get(`/api/shop/${ctx.rsvpToken}/products`);
    expect(hidden.body.data.bundles).toHaveLength(0);
    expect(created.status).toBe(201);
  });

  it("checks out a bundle at the bundle price, with sizes per product", async () => {
    const ctx = await shopWithProducts();
    const created = await createBundle(ctx, {
      name: "Fan pack",
      price: 30,
      items: [{ productId: ctx.capId }, { productId: ctx.teeId }],
    });
    const bundleId = created.body.data.bundle.id as string;

    const missing = await request(app)
      .post(`/api/shop/${ctx.rsvpToken}/checkout`)
      .send({ ...guest, bundles: [{ bundleId, quantity: 1 }] });
    expect(missing.status).toBe(400);

    const ok = await request(app)
      .post(`/api/shop/${ctx.rsvpToken}/checkout`)
      .send({
        ...guest,
        bundles: [
          {
            bundleId,
            quantity: 2,
            selections: [
              { productId: ctx.capId, headCircumference: { value: 56, unit: "cm" } },
              { productId: ctx.teeId, selectedSize: "M" },
            ],
          },
        ],
      });
    expect(ok.status).toBe(200);
    const order = ok.body.data.order;
    expect(order.total).toBe(60);
    expect(order.items).toHaveLength(2);
    expect(order.items.every((i: { bundleName: string }) => i.bundleName === "Fan pack")).toBe(true);
    const lineSum = order.items.reduce((s: number, i: { unitPrice: number; quantity: number }) => s + i.unitPrice * i.quantity, 0);
    expect(Math.round(lineSum * 100)).toBe(6000);
    const tee = order.items.find((i: { productName: string }) => i.productName === "Tee");
    expect(tee.selectedSize).toBe("M");
    expect(tee.quantity).toBe(2);

    // Stock came off the shared products.
    const products = await request(app).get(`/api/events/${ctx.eventId}/products`).set(ctx.auth);
    const teeProduct = products.body.data.products.find((p: { id: string }) => p.id === ctx.teeId);
    expect(teeProduct.stockQuantity).toBe(3);
  });

  it("stops a bundle plus a separate item from overselling a product", async () => {
    const ctx = await shopWithProducts();
    const created = await createBundle(ctx, { name: "Tee pack", price: 20, items: [{ productId: ctx.teeId, quantity: 3 }] });
    const bundleId = created.body.data.bundle.id as string;
    const res = await request(app)
      .post(`/api/shop/${ctx.rsvpToken}/checkout`)
      .send({
        ...guest,
        items: [{ productId: ctx.teeId, quantity: 3, selectedSize: "S" }],
        bundles: [{ bundleId, quantity: 1, selections: [{ productId: ctx.teeId, selectedSize: "S" }] }],
      });
    expect(res.status).toBe(400);
    expect(res.body.error.message).toMatch(/left in stock/);
  });
});
