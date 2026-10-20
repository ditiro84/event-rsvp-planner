import { describe, expect, it } from "vitest";
import {
  DEFAULT_SIZE_OPTIONS,
  describeItemSizing,
  resolveItemSizing,
  resolveSizeOptions,
  toCentimetres,
} from "../../src/utils/merchandiseSizing";

describe("resolveSizeOptions", () => {
  it("falls back to the default XS to XXL list", () => {
    expect(resolveSizeOptions(null)).toEqual(DEFAULT_SIZE_OPTIONS);
    expect(resolveSizeOptions([])).toEqual(DEFAULT_SIZE_OPTIONS);
    expect(resolveSizeOptions(["", "  "])).toEqual(DEFAULT_SIZE_OPTIONS);
  });

  it("uses the planner's own list when set", () => {
    expect(resolveSizeOptions(["Kids", " Adult "])).toEqual(["Kids", "Adult"]);
  });
});

describe("toCentimetres", () => {
  it("converts inches and rounds to one decimal", () => {
    expect(toCentimetres(22, "in")).toBe(55.9);
    expect(toCentimetres(56, "cm")).toBe(56);
  });
});

describe("resolveItemSizing", () => {
  const tshirt = { name: "Tee", fitType: "SIZE_CHART", sizeOptions: ["S", "M", "L"] };
  const cap = { name: "Cap", fitType: "HEAD_CIRCUMFERENCE" };
  const fabric = { name: "Aso ebi", fitType: "NONE" };

  it("requires a size from the chart for T-shirts, matching case-insensitively", () => {
    expect(resolveItemSizing(tshirt, { selectedSize: "m" })).toEqual({ selectedSize: "M", measurements: null });
    expect(() => resolveItemSizing(tshirt, {})).toThrow(/Choose a size/);
    expect(() => resolveItemSizing(tshirt, { selectedSize: "XXL" })).toThrow(/isn't an available size/);
  });

  it("uses the default sizes when the planner set none", () => {
    expect(resolveItemSizing({ name: "Tee", fitType: "SIZE_CHART" }, { selectedSize: "XXL" }).selectedSize).toBe("XXL");
  });

  it("stores cap head circumference as entered plus centimetres", () => {
    const result = resolveItemSizing(cap, { headCircumference: { value: 22, unit: "in" } });
    expect(result.selectedSize).toBeNull();
    expect(result.measurements).toEqual({ headCircumference: { value: 22, unit: "in", cm: 55.9 } });
  });

  it("rejects missing or implausible head measurements", () => {
    expect(() => resolveItemSizing(cap, {})).toThrow(/head circumference/i);
    expect(() => resolveItemSizing(cap, { headCircumference: { value: 20, unit: "cm" } })).toThrow(/between 40 and 70/);
    expect(() => resolveItemSizing(cap, { headCircumference: { value: 30, unit: "in" } })).toThrow(/between 40 and 70/);
    expect(resolveItemSizing(cap, { headCircumference: { value: 40, unit: "cm" } }).measurements).not.toBeNull();
    expect(resolveItemSizing(cap, { headCircumference: { value: 70, unit: "cm" } }).measurements).not.toBeNull();
  });

  it("asks nothing for fabric, gele and other unsized products, even if something is sent", () => {
    expect(resolveItemSizing(fabric, {})).toEqual({ selectedSize: null, measurements: null });
    expect(resolveItemSizing(fabric, { selectedSize: "M" })).toEqual({ selectedSize: null, measurements: null });
    expect(resolveItemSizing({ name: "Old product" }, {})).toEqual({ selectedSize: null, measurements: null });
  });
});

describe("describeItemSizing", () => {
  it("describes sizes and head measurements", () => {
    expect(describeItemSizing({ selectedSize: "M" })).toBe("Size M");
    expect(
      describeItemSizing({ measurements: { headCircumference: { value: 22, unit: "in", cm: 55.9 } } })
    ).toBe("Head 22 in (55.9 cm)");
    expect(describeItemSizing({})).toBe("");
  });
});
