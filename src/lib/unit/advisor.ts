import type { IndustryDef, Inputs, Result } from "./types";
import { inr, pct } from "./format";

export interface Advice {
  verdict: { ok: boolean; text: string };
  drivers: string[];
  cacTest: { text: string; newOp: number; deltaOp: number; deltaContribution: number; newCac: number | null };
  levers: string[];
}

/** Rule-based advisor: every figure comes from the deterministic engine. */
export function advise(def: IndustryDef, inputs: Inputs, r: Result): Advice {
  const ok = r.operatingProfit > 0;
  const verdict = {
    ok,
    text: ok
      ? `The business is profitable: ${inr(r.revenue)} of revenue leaves ${inr(r.operatingProfit)} operating profit (${pct(r.opMargin)} margin). It needs ${r.breakEven ?? "—"} ${r.unitPlural} to break even and currently has ${r.units.toLocaleString("en-IN")}.`
      : r.operatingProfit === 0
        ? `The business exactly breaks even: contribution of ${inr(r.totalContribution)} just covers fixed costs.`
        : `The business is making a loss of ${inr(Math.abs(r.operatingProfit))}. Total contribution of ${inr(r.totalContribution)} does not cover fixed costs of ${inr(r.fixedOverhead + r.additionalExpenses)}.${r.breakEven === null ? " With non-positive contribution per unit, more volume will not fix this — price or variable costs must change." : ` It needs ${r.breakEven} ${r.unitPlural} to break even.`}`,
  };
  const total = r.costs.reduce((s, c) => s + c.value, 0);
  const drivers = [...r.costs]
    .sort((a, b) => b.value - a.value)
    .slice(0, 3)
    .map((c, idx) => `${idx + 1}. ${c.name}: ${inr(c.value)} (${pct(total ? (c.value / total) * 100 : null)} of all costs, ${pct(r.revenue ? (c.value / r.revenue) * 100 : null)} of revenue)`);
  const up = def.compute(def.raiseCac(inputs, 0.2));
  const dC = up.totalContribution - r.totalContribution;
  const dO = up.operatingProfit - r.operatingProfit;
  const cacTest = {
    newOp: up.operatingProfit,
    deltaOp: dO,
    deltaContribution: dC,
    newCac: up.cac,
    text: `If CAC rises 20% (from ${inr(r.cac)} to ${inr(up.cac)}), total contribution falls by ${inr(Math.abs(dC))} to ${inr(up.totalContribution)} and contribution margin moves from ${pct(r.cm)} to ${pct(up.cm)}. Fixed costs are unchanged, so operating profit falls by the same ${inr(Math.abs(dO))} to ${inr(up.operatingProfit)}${up.operatingProfit < 0 ? " — the business would turn loss-making" : ""}. Break-even moves from ${r.breakEven ?? "—"} to ${up.breakEven ?? "not achievable"} ${r.unitPlural}.`,
  };
  return { verdict, drivers, cacTest, levers: def.levers(inputs, r) };
}
