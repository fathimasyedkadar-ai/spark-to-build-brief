export type IndustryId = "education" | "realEstate" | "travel";
export type Inputs = Record<string, number | string>;

export interface FieldDef {
  key: string;
  label: string;
  kind: "currency" | "percent" | "count" | "select";
  group: string;
  options?: { value: string; label: string }[];
  hint?: string;
}

export interface Line {
  label: string;
  value: number;
  kind: "collection" | "tax" | "revenue" | "direct" | "acquisition" | "fixed" | "profit" | "info";
}

export interface Result {
  unitLabel: string;
  unitPlural: string;
  units: number;
  collections: number;
  taxCollected: number;
  revenue: number;
  directCost: number;
  grossProfit: number;
  gpMargin: number | null;
  acquisitionCost: number;
  totalContribution: number;
  contributionPerUnit: number | null;
  cm: number | null;
  fixedOverhead: number;
  additionalExpenses: number;
  operatingProfit: number;
  opMargin: number | null;
  incomeTax: number;
  profitAfterTax: number;
  cac: number | null;
  cpl: number | null;
  breakEven: number | null;
  extraKpis: { label: string; value: number | null; format: "currency" | "percent" | "count" }[];
  costs: { name: string; value: number }[];
  lines: Line[];
  warnings: string[];
  notes: string[];
}

export interface IndustryDef {
  id: IndustryId;
  name: string;
  tagline: string;
  fields: FieldDef[];
  defaults: Inputs;
  best: (i: Inputs) => Inputs;
  worst: (i: Inputs) => Inputs;
  compute: (i: Inputs) => Result;
  /** Inputs with customer acquisition cost raised by `pct` (0.2 = +20%). */
  raiseCac: (i: Inputs, pct: number) => Inputs;
  methodology: { metric: string; formula: string }[];
  levers: (i: Inputs, r: Result) => string[];
}
