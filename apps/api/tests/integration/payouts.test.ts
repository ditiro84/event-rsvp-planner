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

describe("Payout accounts", () => {
  it("lists no payout accounts for a fresh event", async () => {
    const { token } = await registerAndLogin(app);
    const eventId = await createEventWithToken(token);
    const auth = { Authorization: `Bearer ${token}` };

    const res = await request(app).get(`/api/events/${eventId}/payouts`).set(auth);
    expect(res.status).toBe(200);
    expect(res.body.data.payoutAccounts).toEqual([]);
  });

  it("rejects access to another planner's payout accounts", async () => {
    const { token } = await registerAndLogin(app);
    const planner2 = await registerAndLogin(app);
    const eventId = await createEventWithToken(token);

    const res = await request(app)
      .get(`/api/events/${eventId}/payouts`)
      .set("Authorization", `Bearer ${planner2.token}`);
    expect(res.status).toBe(404);
  });

  it("returns a clear error connecting Stripe when Stripe isn't configured", async () => {
    const { token } = await registerAndLogin(app);
    const eventId = await createEventWithToken(token);
    const auth = { Authorization: `Bearer ${token}` };

    const res = await request(app).post(`/api/events/${eventId}/payouts/stripe/connect`).set(auth).send({ currency: "USD" });
    expect(res.status).toBe(400);
    expect(res.body.error.message).toMatch(/STRIPE_SECRET_KEY/);
  });

  it("returns a clear error listing Paystack banks when Paystack isn't configured", async () => {
    const { token } = await registerAndLogin(app);
    const eventId = await createEventWithToken(token);
    const auth = { Authorization: `Bearer ${token}` };

    const res = await request(app).get(`/api/events/${eventId}/payouts/paystack/banks`).set(auth);
    expect(res.status).toBe(400);
    expect(res.body.error.message).toMatch(/PAYSTACK_SECRET_KEY/);
  });

  it("connects and disconnects a PayPal payout account (no external config needed)", async () => {
    const { token } = await registerAndLogin(app);
    const eventId = await createEventWithToken(token);
    const auth = { Authorization: `Bearer ${token}` };

    const connect = await request(app)
      .post(`/api/events/${eventId}/payouts/paypal/connect`)
      .set(auth)
      .send({ currency: "USD", email: "planner@example.com" });
    expect(connect.status).toBe(200);
    const payoutAccountId = connect.body.data.payoutAccountId as string;

    const list = await request(app).get(`/api/events/${eventId}/payouts`).set(auth);
    expect(list.body.data.payoutAccounts).toHaveLength(1);
    expect(list.body.data.payoutAccounts[0]).toMatchObject({
      currency: "USD",
      provider: "PAYPAL",
      connected: true,
      paypalEmail: "planner@example.com",
    });

    const disconnect = await request(app).delete(`/api/events/${eventId}/payouts/${payoutAccountId}`).set(auth);
    expect(disconnect.status).toBe(204);

    const listAfter = await request(app).get(`/api/events/${eventId}/payouts`).set(auth);
    expect(listAfter.body.data.payoutAccounts).toHaveLength(0);
  });

  it("rejects an invalid PayPal email", async () => {
    const { token } = await registerAndLogin(app);
    const eventId = await createEventWithToken(token);
    const auth = { Authorization: `Bearer ${token}` };

    const res = await request(app)
      .post(`/api/events/${eventId}/payouts/paypal/connect`)
      .set(auth)
      .send({ currency: "USD", email: "not-an-email" });
    expect(res.status).toBe(400);
  });

  it("re-connecting PayPal for the same event+currency updates rather than duplicates the account", async () => {
    const { token } = await registerAndLogin(app);
    const eventId = await createEventWithToken(token);
    const auth = { Authorization: `Bearer ${token}` };

    await request(app).post(`/api/events/${eventId}/payouts/paypal/connect`).set(auth).send({ currency: "GBP", email: "first@example.com" });
    await request(app).post(`/api/events/${eventId}/payouts/paypal/connect`).set(auth).send({ currency: "GBP", email: "second@example.com" });

    const list = await request(app).get(`/api/events/${eventId}/payouts`).set(auth);
    expect(list.body.data.payoutAccounts).toHaveLength(1);
    expect(list.body.data.payoutAccounts[0].paypalEmail).toBe("second@example.com");
  });
});

describe("Checkout routing across processors", () => {
  async function setupShopWithProduct(auth: { Authorization: string }, eventId: string, currency: string) {
    await request(app).put(`/api/events/${eventId}`).set(auth).send({ merchandiseEnabled: true });
    const product = await request(app)
      .post(`/api/events/${eventId}/products`)
      .set(auth)
      .send({ name: "Product A", price: 10, currency });
    const eventRes = await request(app).get(`/api/events/${eventId}`).set(auth);
    return { productId: product.body.data.product.id as string, rsvpToken: eventRes.body.data.event.rsvpToken as string };
  }

  it("routes checkout to the connected PayPal account and surfaces PayPal's own config error", async () => {
    const { token } = await registerAndLogin(app);
    const eventId = await createEventWithToken(token);
    const auth = { Authorization: `Bearer ${token}` };

    await request(app).post(`/api/events/${eventId}/payouts/paypal/connect`).set(auth).send({ currency: "USD", email: "planner@example.com" });
    const { productId, rsvpToken } = await setupShopWithProduct(auth, eventId, "USD");

    const checkout = await request(app)
      .post(`/api/shop/${rsvpToken}/checkout`)
      .send({ guestName: "Jane Guest", guestEmail: "jane@example.com", items: [{ productId, quantity: 1 }] });

    // PAYPAL_CLIENT_ID/SECRET aren't set in the test environment -- this
    // confirms checkout correctly selected the connected PayPal account
    // (rather than failing at the "no payout account connected" stage)
    // before hitting PayPal's own "not configured" error.
    expect(checkout.status).toBe(400);
    expect(checkout.body.error.message).toMatch(/PAYPAL_CLIENT_ID/);
  });

  it("rejects checkout when the cart mixes multiple currencies", async () => {
    const { token } = await registerAndLogin(app);
    const eventId = await createEventWithToken(token);
    const auth = { Authorization: `Bearer ${token}` };

    await request(app).put(`/api/events/${eventId}`).set(auth).send({ merchandiseEnabled: true });
    const usdProduct = await request(app).post(`/api/events/${eventId}/products`).set(auth).send({ name: "USD item", price: 10, currency: "USD" });
    const gbpProduct = await request(app).post(`/api/events/${eventId}/products`).set(auth).send({ name: "GBP item", price: 10, currency: "GBP" });
    const eventRes = await request(app).get(`/api/events/${eventId}`).set(auth);
    const rsvpToken = eventRes.body.data.event.rsvpToken;

    const checkout = await request(app)
      .post(`/api/shop/${rsvpToken}/checkout`)
      .send({
        guestName: "Jane Guest",
        guestEmail: "jane@example.com",
        items: [
          { productId: usdProduct.body.data.product.id, quantity: 1 },
          { productId: gbpProduct.body.data.product.id, quantity: 1 },
        ],
      });

    expect(checkout.status).toBe(400);
    expect(checkout.body.error.message).toMatch(/different currencies/);
  });

  it("rejects checkout for a specific provider that isn't connected, even if another provider is", async () => {
    const { token } = await registerAndLogin(app);
    const eventId = await createEventWithToken(token);
    const auth = { Authorization: `Bearer ${token}` };

    await request(app).post(`/api/events/${eventId}/payouts/paypal/connect`).set(auth).send({ currency: "USD", email: "planner@example.com" });
    const { productId, rsvpToken } = await setupShopWithProduct(auth, eventId, "USD");

    const checkout = await request(app)
      .post(`/api/shop/${rsvpToken}/checkout`)
      .send({
        guestName: "Jane Guest",
        guestEmail: "jane@example.com",
        items: [{ productId, quantity: 1 }],
        provider: "STRIPE_CONNECT",
      });

    expect(checkout.status).toBe(400);
    expect(checkout.body.error.message).toMatch(/STRIPE_CONNECT isn't connected/);
  });
});

describe("Public shop payment options", () => {
  it("reports which providers are connected per currency", async () => {
    const { token } = await registerAndLogin(app);
    const eventId = await createEventWithToken(token);
    const auth = { Authorization: `Bearer ${token}` };

    await request(app).post(`/api/events/${eventId}/payouts/paypal/connect`).set(auth).send({ currency: "USD", email: "planner@example.com" });
    const { rsvpToken } = await setupShopWithProduct(auth, eventId, "USD");

    const shop = await request(app).get(`/api/shop/${rsvpToken}/products`);
    expect(shop.status).toBe(200);
    expect(shop.body.data.paymentOptionsByCurrency).toEqual({ USD: ["PAYPAL"] });
  });

  async function setupShopWithProduct(auth: { Authorization: string }, eventId: string, currency: string) {
    await request(app).put(`/api/events/${eventId}`).set(auth).send({ merchandiseEnabled: true });
    const product = await request(app)
      .post(`/api/events/${eventId}/products`)
      .set(auth)
      .send({ name: "Product A", price: 10, currency });
    const eventRes = await request(app).get(`/api/events/${eventId}`).set(auth);
    return { productId: product.body.data.product.id as string, rsvpToken: eventRes.body.data.event.rsvpToken as string };
  }
});
