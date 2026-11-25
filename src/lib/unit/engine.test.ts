import { describe, expect, it } from "vitest";
import { education, realEstate, travel } from "./engine";

describe("education defaults", () => {
  const r = education.compute(education.defaults);
  it("net revenue = 25000/1.18 × 30", () => expect(r.revenue).toBeCloseTo(635593.22, 1));
  it("operating profit", () => expect(r.operatingProfit).toBeCloseTo(113093.22, 1));
  it("CPL 500, CAC 5000", () => { expect(r.cpl).toBe(500); expect(r.cac).toBe(5000); });
  it("break-even 10 students", () => expect(r.breakEven).toBe(10));
});

describe("real estate defaults", () => {
  const r = realEstate.compute(realEstate.defaults);
  it("brokerage revenue 3,60,000", () => expect(r.revenue).toBe(360000));
  it("contribution per deal 95,000", () => expect(r.contributionPerUnit).toBe(95000));
  it("operating profit 2,65,000", () => expect(r.operatingProfit).toBe(265000));
  it("CAC 20,000, CPL 200, break-even 1", () => { expect(r.cac).toBe(20000); expect(r.cpl).toBe(200); expect(r.breakEven).toBe(1); });
});

describe("travel defaults", () => {
  const r = travel.compute(travel.defaults);
  it("gross revenue 7,00,000", () => expect(r.revenue).toBe(700000));
  it("contribution per traveler 5,000", () => expect(r.contributionPerUnit).toBe(5000));
  it("operating profit 80,000 and break-even 4", () => { expect(r.operatingProfit).toBe(80000); expect(r.breakEven).toBe(4); });
  it("GST excluded from revenue", () => expect(r.taxCollected).toBe(35000));
});

describe("guards", () => {
  it("no break-even when contribution negative", () => {
    const r = travel.compute({ ...travel.defaults, supplierCost: 40000 });
    expect(r.breakEven).toBeNull();
    expect(r.warnings.length).toBeGreaterThan(0);
  });
  it("zero leads gives null CPL", () => expect(education.compute({ ...education.defaults, leads: 0 }).cpl).toBeNull());
  it("CAC +20% lowers real estate operating profit by 12,000", () => {
    const b = realEstate.compute(realEstate.defaults).operatingProfit;
    const u = realEstate.compute(realEstate.raiseCac(realEstate.defaults, 0.2)).operatingProfit;
    expect(b - u).toBeCloseTo(12000, 5);
  });
});
