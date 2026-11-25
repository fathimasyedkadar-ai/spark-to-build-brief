import type { IndustryDef, IndustryId, Inputs, Line, Result } from "./types";

export const n = (v: unknown): number => {
  const x = typeof v === "number" ? v : parseFloat(String(v));
  return Number.isFinite(x) ? x : 0;
};
export const safeDiv = (a: number, b: number): number | null => (b === 0 || !Number.isFinite(b) ? null : a / b);
export const pctOf = (a: number, b: number): number | null => {
  const d = safeDiv(a, b);
  return d === null ? null : d * 100;
};
export const breakEvenUnits = (fixed: number, perUnit: number | null): number | null => {
  if (perUnit === null || perUnit <= 0) return null;
  if (fixed <= 0) return 0;
  return Math.ceil(fixed / perUnit - 1e-9);
};
const r2 = (x: number) => Math.round(x * 100) / 100;
const scale = (i: Inputs, keys: string[], f: number): Inputs => {
  const o = { ...i };
  keys.forEach((k) => (o[k] = r2(n(i[k]) * f)));
  return o;
};

function finish(
  base: Omit<Result, "operatingProfit" | "opMargin" | "incomeTax" | "profitAfterTax" | "breakEven" | "cm" | "gpMargin">,
  taxRate: number,
): Result {
  const operatingProfit = base.totalContribution - base.fixedOverhead - base.additionalExpenses;
  const incomeTax = operatingProfit > 0 ? (operatingProfit * taxRate) / 100 : 0;
  const warnings = [...base.warnings];
  if (base.contributionPerUnit !== null && base.contributionPerUnit <= 0)
    warnings.push(
      `Contribution per ${base.unitLabel} is ${base.contributionPerUnit === 0 ? "zero" : "negative"} — every extra ${base.unitLabel} adds to the loss, so break-even is impossible.`,
    );
  if (base.units <= 0) warnings.push(`No ${base.unitPlural} entered — per-unit metrics cannot be calculated.`);
  if (operatingProfit < 0) warnings.push(`Operating loss of ₹${Math.abs(Math.round(operatingProfit)).toLocaleString("en-IN")} for the period.`);
  return {
    ...base,
    warnings,
    gpMargin: pctOf(base.grossProfit, base.revenue),
    cm: pctOf(base.totalContribution, base.revenue),
    operatingProfit,
    opMargin: pctOf(operatingProfit, base.revenue),
    incomeTax,
    profitAfterTax: operatingProfit - incomeTax,
    breakEven: breakEvenUnits(base.fixedOverhead + base.additionalExpenses, base.contributionPerUnit),
  };
}

const commonFields = [
  { key: "additionalExpenses", label: "Optional additional fixed expenses", kind: "currency", group: "Fixed & other" },
  { key: "incomeTaxRate", label: "Estimated income tax on profit", kind: "percent", group: "Fixed & other", hint: "Applied only when operating profit is positive" },
] as const;

/* ---------------- EDUCATION ---------------- */
export const education: IndustryDef = {
  id: "education",
  name: "Education",
  tagline: "Per-batch economics of a paid course",
  fields: [
    { key: "courseFee", label: "Course fee (as charged)", kind: "currency", group: "Pricing & tax" },
    { key: "gstRate", label: "GST rate", kind: "percent", group: "Pricing & tax" },
    { key: "gstTreatment", label: "GST treatment of fee", kind: "select", group: "Pricing & tax", options: [{ value: "inclusive", label: "Inclusive (fee includes GST)" }, { value: "exclusive", label: "Exclusive (GST added on top)" }] },
    { key: "inputCredit", label: "GST on costs (input credit)", kind: "select", group: "Pricing & tax", options: [{ value: "recoverable", label: "Recoverable — not an expense" }, { value: "notRecoverable", label: "Not recoverable — add to cost" }] },
    { key: "costGstRate", label: "GST rate paid on direct costs", kind: "percent", group: "Pricing & tax", hint: "Costs below are entered excluding GST" },
    { key: "students", label: "Number of students", kind: "count", group: "Volume" },
    { key: "discountsRefunds", label: "Discounts & refunds (total, ex-GST)", kind: "currency", group: "Volume" },
    { key: "lmsCost", label: "LMS cost / student", kind: "currency", group: "Direct service costs" },
    { key: "gatewayCost", label: "Payment gateway / student", kind: "currency", group: "Direct service costs" },
    { key: "trainerCost", label: "Trainer cost / student", kind: "currency", group: "Direct service costs" },
    { key: "salesCost", label: "Sales cost / student", kind: "currency", group: "Sales & acquisition" },
    { key: "marketingCost", label: "Marketing cost / student", kind: "currency", group: "Sales & acquisition" },
    { key: "adSpend", label: "Advertising spend", kind: "currency", group: "Funnel", hint: "Used for CPL & CAC; already reflected in marketing cost/student" },
    { key: "leads", label: "Leads", kind: "count", group: "Funnel" },
    { key: "attributedStudents", label: "Attributed paying students", kind: "count", group: "Funnel", hint: "Students won from the ad spend" },
    { key: "fixedOverhead", label: "Fixed batch overhead", kind: "currency", group: "Fixed & other" },
    ...commonFields,
  ],
  defaults: {
    courseFee: 25000, gstRate: 18, gstTreatment: "inclusive", inputCredit: "recoverable", costGstRate: 18,
    students: 30, discountsRefunds: 0, lmsCost: 2500, gatewayCost: 750, trainerCost: 5000,
    salesCost: 2500, marketingCost: 5000, adSpend: 150000, leads: 300, attributedStudents: 30,
    fixedOverhead: 50000, additionalExpenses: 0, incomeTaxRate: 0,
  },
  best: (i) => ({ ...scale(i, ["students", "attributedStudents", "leads"], 1.2), marketingCost: r2(n(i["marketingCost"]) * 0.9) }),
  worst: (i) => ({ ...scale(i, ["students", "attributedStudents"], 0.7), marketingCost: r2(n(i["marketingCost"]) * 1.25), discountsRefunds: r2(n(i["discountsRefunds"]) + 25000) }),
  raiseCac: (i, p) => scale(i, ["marketingCost", "adSpend"], 1 + p),
  compute: (i) => {
    const fee = n(i["courseFee"]), g = n(i["gstRate"]) / 100, students = Math.max(0, n(i["students"]));
    const inclusive = i["gstTreatment"] !== "exclusive";
    const revPerStudent = inclusive ? fee / (1 + g) : fee;
    const gstPerStudent = inclusive ? fee - revPerStudent : fee * g;
    const disc = n(i["discountsRefunds"]);
    const revenue = revPerStudent * students - disc;
    const directBase = n(i["lmsCost"]) + n(i["gatewayCost"]) + n(i["trainerCost"]);
    const nonRecGst = i["inputCredit"] === "notRecoverable" ? (directBase * n(i["costGstRate"])) / 100 : 0;
    const directPer = directBase + nonRecGst;
    const directCost = directPer * students;
    const grossProfit = revenue - directCost;
    const smPer = n(i["salesCost"]) + n(i["marketingCost"]);
    const acquisitionCost = smPer * students;
    const totalContribution = grossProfit - acquisitionCost;
    const cpu = safeDiv(totalContribution, students);
    const warnings: string[] = [];
    if (n(i["leads"]) <= 0) warnings.push("Leads is zero — CPL cannot be calculated.");
    if (n(i["attributedStudents"]) <= 0) warnings.push("No attributed paying students — CAC cannot be calculated.");
    if (disc > revPerStudent * students) warnings.push("Discounts & refunds exceed gross tuition revenue.");
    const lines: Line[] = [
      { label: "Customer collections (incl. GST)", value: (revPerStudent + gstPerStudent) * students, kind: "collection" },
      { label: "Less: GST collected (passed to government)", value: -gstPerStudent * students, kind: "tax" },
      { label: "Less: discounts & refunds", value: -disc, kind: "revenue" },
      { label: "Net revenue", value: revenue, kind: "revenue" },
      { label: "Less: direct service costs (LMS, gateway, trainer)", value: -directCost, kind: "direct" },
      { label: "Gross profit", value: grossProfit, kind: "profit" },
      { label: "Less: sales & marketing (variable)", value: -acquisitionCost, kind: "acquisition" },
      { label: "Total contribution", value: totalContribution, kind: "profit" },
    ];
    return finish({
      unitLabel: "student", unitPlural: "students", units: students,
      collections: (revPerStudent + gstPerStudent) * students, taxCollected: gstPerStudent * students,
      revenue, directCost, grossProfit, acquisitionCost, totalContribution, contributionPerUnit: cpu,
      fixedOverhead: n(i["fixedOverhead"]), additionalExpenses: n(i["additionalExpenses"]),
      cac: safeDiv(n(i["adSpend"]), n(i["attributedStudents"])), cpl: safeDiv(n(i["adSpend"]), n(i["leads"])),
      extraKpis: [
        { label: "Revenue / student (ex-GST)", value: revPerStudent, format: "currency" },
        { label: "GST / student", value: gstPerStudent, format: "currency" },
        { label: "Direct cost / student", value: directPer, format: "currency" },
        { label: "Contribution / student", value: cpu, format: "currency" },
        { label: "Lead-to-student conversion", value: pctOf(n(i["attributedStudents"]), n(i["leads"])), format: "percent" },
      ],
      costs: [
        { name: "Trainer", value: n(i["trainerCost"]) * students },
        { name: "LMS", value: n(i["lmsCost"]) * students },
        { name: "Payment gateway", value: n(i["gatewayCost"]) * students },
        { name: "Non-recoverable GST", value: nonRecGst * students },
        { name: "Sales", value: n(i["salesCost"]) * students },
        { name: "Marketing", value: n(i["marketingCost"]) * students },
        { name: "Fixed overhead", value: n(i["fixedOverhead"]) },
        { name: "Additional expenses", value: n(i["additionalExpenses"]) },
      ].filter((c) => c.value > 0),
      lines, warnings,
      notes: [
        inclusive ? "Course fee is GST-inclusive, so revenue = fee ÷ (1 + GST rate)." : "Course fee is GST-exclusive; GST is added on top and is not revenue.",
        i["inputCredit"] === "notRecoverable" ? "GST paid on direct costs is not recoverable, so it is added to direct cost." : "GST paid on costs is recoverable as input credit, so it is kept out of expenses.",
        "Advertising spend is used for CPL/CAC only; its cost is already inside marketing cost per student, so it is not deducted twice.",
      ],
    }, n(i["incomeTaxRate"]));
  },
  methodology: [
    { metric: "Revenue before GST / student", formula: "Inclusive: Fee ÷ (1 + GST) · Exclusive: Fee" },
    { metric: "GST / student", formula: "Fee − Revenue before GST (inclusive) or Fee × GST (exclusive)" },
    { metric: "Net revenue", formula: "Revenue before GST × Students − Discounts & refunds" },
    { metric: "Direct cost / student", formula: "LMS + Gateway + Trainer (+ non-recoverable GST)" },
    { metric: "Gross profit", formula: "Net revenue − Direct cost × Students" },
    { metric: "Contribution", formula: "Gross profit − (Sales + Marketing) × Students" },
    { metric: "Operating profit", formula: "Total contribution − Fixed batch overhead − Additional expenses" },
    { metric: "CPL", formula: "Advertising spend ÷ Leads" },
    { metric: "CAC / student", formula: "Advertising spend ÷ Attributed paying students" },
    { metric: "Break-even students", formula: "CEILING(Fixed costs ÷ Contribution per student), if contribution > 0" },
  ],
  levers: (i, r) => {
    const out: string[] = [];
    const cpu = r.contributionPerUnit ?? 0;
    out.push(`Raising the course fee by 10% (to ₹${Math.round(n(i["courseFee"]) * 1.1).toLocaleString("en-IN")}) adds roughly ₹${Math.round((n(i["courseFee"]) * 0.1) / (i["gstTreatment"] === "exclusive" ? 1 : 1 + n(i["gstRate"]) / 100) * r.units).toLocaleString("en-IN")} of net revenue per batch.`);
    if (cpu > 0) out.push(`Each extra student adds ₹${Math.round(cpu).toLocaleString("en-IN")} of contribution — filling ${Math.ceil(r.units * 0.2)} more seats lifts operating profit by about ₹${Math.round(cpu * Math.ceil(r.units * 0.2)).toLocaleString("en-IN")}.`);
    out.push(`Marketing (₹${n(i["marketingCost"]).toLocaleString("en-IN")}/student) is the largest acquisition cost — improving lead conversion from ${(pctOf(n(i["attributedStudents"]), n(i["leads"])) ?? 0).toFixed(1)}% via referrals or alumni offers cuts CAC directly.`);
    out.push(`Trainer cost of ₹${n(i["trainerCost"]).toLocaleString("en-IN")}/student shrinks as batch size grows if trainers are paid per batch rather than per head.`);
    return out;
  },
};

/* ---------------- REAL ESTATE ---------------- */
export const realEstate: IndustryDef = {
  id: "realEstate",
  name: "Real Estate",
  tagline: "Monthly brokerage economics per closed deal",
  fields: [
    { key: "propertyValue", label: "Average property value", kind: "currency", group: "Deal value" },
    { key: "commissionRate", label: "Brokerage commission", kind: "percent", group: "Deal value" },
    { key: "gstRate", label: "GST on brokerage (shown separately)", kind: "percent", group: "Deal value" },
    { key: "adSpend", label: "Advertising spend", kind: "currency", group: "Funnel" },
    { key: "leads", label: "Leads", kind: "count", group: "Funnel" },
    { key: "qualifiedLeads", label: "Qualified leads", kind: "count", group: "Funnel" },
    { key: "siteVisits", label: "Site visits", kind: "count", group: "Funnel" },
    { key: "bookedDeals", label: "Booked deals", kind: "count", group: "Funnel" },
    { key: "cancellationRate", label: "Cancellation rate (booked → closed)", kind: "percent", group: "Funnel", hint: "Informational; closed deals already exclude cancellations" },
    { key: "closedDeals", label: "Closed deals", kind: "count", group: "Funnel" },
    { key: "directCost", label: "Direct service cost / closed deal", kind: "currency", group: "Costs", hint: "e.g. legal / documentation support" },
    { key: "salesCost", label: "Sales cost / closed deal", kind: "currency", group: "Costs" },
    { key: "fixedOverhead", label: "Monthly fixed overhead", kind: "currency", group: "Fixed & other" },
    ...commonFields,
  ],
  defaults: {
    propertyValue: 6000000, commissionRate: 2, gstRate: 18, adSpend: 60000, leads: 300, qualifiedLeads: 60,
    siteVisits: 15, bookedDeals: 4, cancellationRate: 25, closedDeals: 3, directCost: 0, salesCost: 5000,
    fixedOverhead: 20000, additionalExpenses: 0, incomeTaxRate: 0,
  },
  best: (i) => ({ ...scale(i, ["leads", "qualifiedLeads", "siteVisits"], 1.2), bookedDeals: n(i["bookedDeals"]) + 1, closedDeals: n(i["closedDeals"]) + 1, cancellationRate: 20 }),
  worst: (i) => ({ ...i, closedDeals: Math.max(0, n(i["closedDeals"]) - 1), cancellationRate: 50, adSpend: r2(n(i["adSpend"]) * 1.2) }),
  raiseCac: (i, p) => scale(i, ["adSpend"], 1 + p),
  compute: (i) => {
    const closed = Math.max(0, n(i["closedDeals"]));
    const revPer = (n(i["propertyValue"]) * n(i["commissionRate"])) / 100;
    const revenue = revPer * closed;
    const ad = n(i["adSpend"]);
    const cac = safeDiv(ad, closed);
    const directCost = n(i["directCost"]) * closed;
    const grossProfit = revenue - directCost;
    const acquisitionCost = ad + n(i["salesCost"]) * closed;
    const cpu = cac === null ? null : revPer - n(i["directCost"]) - cac - n(i["salesCost"]);
    const totalContribution = cpu === null ? grossProfit - acquisitionCost : cpu * closed;
    const warnings: string[] = [];
    if (closed <= 0) warnings.push("No closed deals — CAC and contribution per deal cannot be calculated; ad spend is a pure loss.");
    if (n(i["leads"]) <= 0) warnings.push("Leads is zero — CPL cannot be calculated.");
    const f = [n(i["leads"]), n(i["qualifiedLeads"]), n(i["siteVisits"]), n(i["bookedDeals"]), closed];
    if (f.some((v, k) => k > 0 && v > (f[k - 1] ?? 0))) warnings.push("Funnel is inconsistent: a later stage is larger than the earlier one.");
    const expectedClosed = n(i["bookedDeals"]) * (1 - n(i["cancellationRate"]) / 100);
    const notes = [
      "Revenue is brokerage commission only — never the full property value.",
      `Closed deals already exclude cancellations (${n(i["bookedDeals"])} booked × (1 − ${n(i["cancellationRate"])}%) ≈ ${expectedClosed.toFixed(1)}), so cancellations are not deducted again.`,
      "CAC (ad spend ÷ closed deals) is deducted once inside contribution per deal; ad spend is not deducted separately.",
    ];
    const gst = (revenue * n(i["gstRate"])) / 100;
    return finish({
      unitLabel: "deal", unitPlural: "closed deals", units: closed,
      collections: revenue + gst, taxCollected: gst, revenue, directCost, grossProfit, acquisitionCost,
      totalContribution, contributionPerUnit: cpu,
      fixedOverhead: n(i["fixedOverhead"]), additionalExpenses: n(i["additionalExpenses"]),
      cac, cpl: safeDiv(ad, n(i["leads"])),
      extraKpis: [
        { label: "Brokerage / closed deal", value: revPer, format: "currency" },
        { label: "Cost per site visit", value: safeDiv(ad, n(i["siteVisits"])), format: "currency" },
        { label: "Lead-to-close rate", value: pctOf(closed, n(i["leads"])), format: "percent" },
        { label: "Visit-to-close rate", value: pctOf(closed, n(i["siteVisits"])), format: "percent" },
        { label: "Contribution / deal", value: cpu, format: "currency" },
      ],
      costs: [
        { name: "Advertising (CAC)", value: ad },
        { name: "Sales cost", value: n(i["salesCost"]) * closed },
        { name: "Direct service", value: directCost },
        { name: "Fixed overhead", value: n(i["fixedOverhead"]) },
        { name: "Additional expenses", value: n(i["additionalExpenses"]) },
      ].filter((c) => c.value > 0),
      lines: [
        { label: "Client collections (brokerage incl. GST)", value: revenue + gst, kind: "collection" },
        { label: "Less: GST on brokerage", value: -gst, kind: "tax" },
        { label: "Brokerage revenue", value: revenue, kind: "revenue" },
        { label: "Less: direct service cost", value: -directCost, kind: "direct" },
        { label: "Gross profit", value: grossProfit, kind: "profit" },
        { label: "Less: CAC (advertising) + sales cost", value: -acquisitionCost, kind: "acquisition" },
        { label: "Total contribution", value: totalContribution, kind: "profit" },
      ],
      warnings, notes,
    }, n(i["incomeTaxRate"]));
  },
  methodology: [
    { metric: "Brokerage / closed deal", formula: "Property value × Commission rate" },
    { metric: "Total brokerage revenue", formula: "Brokerage / deal × Closed deals" },
    { metric: "CPL", formula: "Advertising spend ÷ Leads" },
    { metric: "Cost per site visit", formula: "Advertising spend ÷ Site visits" },
    { metric: "Lead-to-close rate", formula: "Closed deals ÷ Leads × 100" },
    { metric: "CAC / closed deal", formula: "Advertising spend ÷ Closed deals" },
    { metric: "Contribution / deal", formula: "Brokerage / deal − Direct cost − CAC − Sales cost / deal" },
    { metric: "Total contribution", formula: "Contribution / deal × Closed deals" },
    { metric: "Operating profit", formula: "Total contribution − Monthly fixed overhead − Additional expenses" },
    { metric: "Break-even deals", formula: "CEILING(Fixed costs ÷ Contribution per deal), if contribution > 0" },
  ],
  levers: (i, r) => {
    const out: string[] = [];
    const revPer = (n(i["propertyValue"]) * n(i["commissionRate"])) / 100;
    out.push(`Converting one more site visit into a closed deal adds about ₹${Math.round(revPer - n(i["salesCost"]) - n(i["directCost"])).toLocaleString("en-IN")} of contribution (ad spend is already sunk).`);
    out.push(`Reducing cancellations from ${n(i["cancellationRate"])}% protects booked deals — each saved booking is worth ₹${Math.round(revPer).toLocaleString("en-IN")} of brokerage.`);
    out.push(`Only ${(pctOf(n(i["siteVisits"]), n(i["qualifiedLeads"])) ?? 0).toFixed(0)}% of qualified leads visit a site — faster follow-up and virtual tours can lift visits without extra ad spend.`);
    if (r.cac !== null) out.push(`Negotiating commission up by 0.25 points adds ₹${Math.round(n(i["propertyValue"]) * 0.0025 * r.units).toLocaleString("en-IN")} per month at current volume.`);
    return out;
  },
};

/* ---------------- TRAVEL ---------------- */
export const travel: IndustryDef = {
  id: "travel",
  name: "Travel Agency",
  tagline: "Package-tour economics on the gross revenue model",
  fields: [
    { key: "sellingPrice", label: "Selling price / traveler (ex-GST)", kind: "currency", group: "Pricing & tax" },
    { key: "gstRate", label: "GST rate (illustrative)", kind: "percent", group: "Pricing & tax" },
    { key: "taxTreatment", label: "Selling price tax treatment", kind: "select", group: "Pricing & tax", options: [{ value: "exclusive", label: "Exclusive (GST added on top)" }, { value: "inclusive", label: "Inclusive (price includes GST)" }] },
    { key: "travelersBooked", label: "Travelers booked", kind: "count", group: "Volume" },
    { key: "cancellationRate", label: "Booking cancellation rate", kind: "percent", group: "Volume" },
    { key: "supplierCost", label: "Supplier cost / traveler", kind: "currency", group: "Direct fulfilment costs" },
    { key: "otherVariableCost", label: "Other variable cost / traveler", kind: "currency", group: "Direct fulfilment costs" },
    { key: "gatewayFee", label: "Payment gateway fee / traveler", kind: "currency", group: "Sales & acquisition" },
    { key: "partnerCommissionRate", label: "Partner commission rate", kind: "percent", group: "Sales & acquisition" },
    { key: "adSpend", label: "Advertising spend", kind: "currency", group: "Sales & acquisition" },
    { key: "leads", label: "Leads (optional, for CPL)", kind: "count", group: "Sales & acquisition" },
    { key: "fixedOverhead", label: "Fixed period overhead", kind: "currency", group: "Fixed & other" },
    ...commonFields,
  ],
  defaults: {
    sellingPrice: 35000, gstRate: 5, taxTreatment: "exclusive", travelersBooked: 20, cancellationRate: 0,
    supplierCost: 25000, otherVariableCost: 2000, gatewayFee: 0, partnerCommissionRate: 0, adSpend: 60000,
    leads: 0, fixedOverhead: 20000, additionalExpenses: 0, incomeTaxRate: 0,
  },
  best: (i) => ({ ...scale(i, ["travelersBooked"], 1.25), supplierCost: r2(n(i["supplierCost"]) * 0.95) }),
  worst: (i) => ({ ...i, cancellationRate: 15, supplierCost: r2(n(i["supplierCost"]) * 1.08), adSpend: r2(n(i["adSpend"]) * 1.2) }),
  raiseCac: (i, p) => scale(i, ["adSpend"], 1 + p),
  compute: (i) => {
    const inclusive = i["taxTreatment"] === "inclusive";
    const g = n(i["gstRate"]) / 100;
    const price = inclusive ? n(i["sellingPrice"]) / (1 + g) : n(i["sellingPrice"]);
    const gstPer = inclusive ? n(i["sellingPrice"]) - price : n(i["sellingPrice"]) * g;
    const canc = Math.min(100, Math.max(0, n(i["cancellationRate"]))) / 100;
    const net = Math.max(0, n(i["travelersBooked"])) * (1 - canc);
    const revenue = price * net;
    const supplier = n(i["supplierCost"]), other = n(i["otherVariableCost"]);
    const cac = safeDiv(n(i["adSpend"]), net);
    const partner = price * (n(i["partnerCommissionRate"]) / 100);
    const varPer = supplier + other + (cac ?? 0) + partner + n(i["gatewayFee"]);
    const gpPer = price - supplier;
    const cpu = net > 0 ? price - varPer : null;
    const grossProfit = gpPer * net;
    const directCost = supplier * net;
    const acquisitionCost = n(i["adSpend"]) + (other + partner + n(i["gatewayFee"])) * net;
    const totalContribution = cpu === null ? -n(i["adSpend"]) : cpu * net;
    const warnings: string[] = [];
    if (net <= 0) warnings.push("No completed travelers — CAC and per-traveler metrics cannot be calculated.");
    if (gpPer < 0) warnings.push("Supplier cost exceeds selling price — every package loses money before acquisition costs.");
    return finish({
      unitLabel: "traveler", unitPlural: "travelers", units: net,
      collections: (price + gstPer) * net, taxCollected: gstPer * net, revenue, directCost, grossProfit,
      acquisitionCost, totalContribution, contributionPerUnit: cpu,
      fixedOverhead: n(i["fixedOverhead"]), additionalExpenses: n(i["additionalExpenses"]),
      cac, cpl: safeDiv(n(i["adSpend"]), n(i["leads"])),
      extraKpis: [
        { label: "Net completed travelers", value: net, format: "count" },
        { label: "Gross profit / traveler", value: gpPer, format: "currency" },
        { label: "Total variable cost / traveler", value: net > 0 ? varPer : null, format: "currency" },
        { label: "Contribution / traveler", value: cpu, format: "currency" },
        { label: "GST / traveler (not revenue)", value: gstPer, format: "currency" },
      ],
      costs: [
        { name: "Supplier", value: directCost },
        { name: "Other variable", value: other * net },
        { name: "Advertising (CAC)", value: n(i["adSpend"]) },
        { name: "Partner commission", value: partner * net },
        { name: "Payment gateway", value: n(i["gatewayFee"]) * net },
        { name: "Fixed overhead", value: n(i["fixedOverhead"]) },
        { name: "Additional expenses", value: n(i["additionalExpenses"]) },
      ].filter((c) => c.value > 0),
      lines: [
        { label: "Customer collections (incl. GST)", value: (price + gstPer) * net, kind: "collection" },
        { label: "Less: GST collected", value: -gstPer * net, kind: "tax" },
        { label: "Gross revenue (package price × completed travelers)", value: revenue, kind: "revenue" },
        { label: "Less: supplier cost", value: -directCost, kind: "direct" },
        { label: "Gross profit", value: grossProfit, kind: "profit" },
        { label: "Less: other variable, CAC, commission, gateway", value: -acquisitionCost, kind: "acquisition" },
        { label: "Total contribution", value: totalContribution, kind: "profit" },
      ],
      warnings,
      notes: [
        "Gross revenue model: the full package selling price is revenue; supplier costs are deducted separately.",
        "GST is shown separately and excluded from revenue and profit.",
        "Cancelled bookings are removed once, via net completed travelers; CAC is spread over completed travelers only.",
      ],
    }, n(i["incomeTaxRate"]));
  },
  methodology: [
    { metric: "Net completed travelers", formula: "Booked × (1 − Cancellation rate)" },
    { metric: "Gross revenue", formula: "Selling price × Net completed travelers" },
    { metric: "CAC / traveler", formula: "Advertising spend ÷ Net completed travelers" },
    { metric: "Partner commission / traveler", formula: "Selling price × Partner commission rate" },
    { metric: "Total variable cost / traveler", formula: "Supplier + Other variable + CAC + Partner commission + Gateway fee" },
    { metric: "Gross profit / traveler", formula: "Selling price − Supplier cost" },
    { metric: "Contribution / traveler", formula: "Selling price − Total variable cost / traveler" },
    { metric: "Operating profit", formula: "Total contribution − Fixed period overhead − Additional expenses" },
    { metric: "Operating profit margin", formula: "Operating profit ÷ Gross revenue × 100" },
    { metric: "Break-even travelers", formula: "CEILING(Fixed costs ÷ Contribution per traveler), if contribution > 0" },
  ],
  levers: (i, r) => {
    const out: string[] = [];
    out.push(`A 5% better supplier rate saves ₹${Math.round(n(i["supplierCost"]) * 0.05).toLocaleString("en-IN")} per traveler — ₹${Math.round(n(i["supplierCost"]) * 0.05 * r.units).toLocaleString("en-IN")} across this period.`);
    out.push(`Each extra traveler on the same ad spend lowers CAC; adding 5 travelers would cut CAC to ₹${Math.round(n(i["adSpend"]) / (r.units + 5 || 1)).toLocaleString("en-IN")}.`);
    out.push(`Upselling add-ons (visas, insurance, excursions) at ₹2,000 margin each would add ₹${Math.round(2000 * r.units).toLocaleString("en-IN")} of contribution.`);
    if (n(i["cancellationRate"]) > 0) out.push(`Non-refundable deposits could reduce the ${n(i["cancellationRate"])}% cancellation rate and recover lost revenue.`);
    return out;
  },
};

export const INDUSTRIES: Record<IndustryId, IndustryDef> = { education, realEstate, travel };
