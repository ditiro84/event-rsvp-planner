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
    expect(res.text).toMatch(/Event Tee,1,L/);
    expect(res.text).toMatch(/Event Cap,1,,56,56 cm/);
    // A guest name that looks like a formula is neutralised.
    expect(res.text).toMatch(/'=SUM\(1\+1\)/);
  });
});
