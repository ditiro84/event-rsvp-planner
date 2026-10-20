import { describe, expect, it } from "vitest";
import { allocateBundlePrice } from "../../src/utils/bundlePricing";

describe("allocateBundlePrice", () => {
  it("splits in proportion to each product's own price and adds up exactly", () => {
    const result = allocateBundlePrice(3000, [
      { productId: "cap", priceCents: 1500, quantity: 1 },
      { productId: "tee", priceCents: 2500, quantity: 1 },
    ]);
    expect(result.get("cap")).toBe(1125);
    expect(result.get("tee")).toBe(1875);
    expect((result.get("cap") ?? 0) + (result.get("tee") ?? 0)).toBe(3000);
  });

  it("never loses a cent to rounding", () => {
    const result = allocateBundlePrice(1000, [
      { productId: "a", priceCents: 100, quantity: 1 },
      { productId: "b", priceCents: 100, quantity: 1 },
      { productId: "c", priceCents: 100, quantity: 1 },
    ]);
    const sum = Array.from(result.values()).reduce((x, y) => x + y, 0);
    expect(sum).toBe(1000);
  });

  it("counts quantities inside the bundle", () => {
    const result = allocateBundlePrice(900, [
      { productId: "tee", priceCents: 500, quantity: 2 },
      { productId: "cap", priceCents: 500, quantity: 1 },
    ]);
    expect(result.get("tee")).toBe(600);
    expect(result.get("cap")).toBe(300);
  });

  it("falls back to quantities when every product is free on its own", () => {
    const result = allocateBundlePrice(600, [
      { productId: "a", priceCents: 0, quantity: 1 },
      { productId: "b", priceCents: 0, quantity: 2 },
    ]);
    expect(result.get("a")).toBe(200);
    expect(result.get("b")).toBe(400);
  });

  it("handles an empty bundle", () => {
    expect(allocateBundlePrice(100, []).size).toBe(0);
  });
});
