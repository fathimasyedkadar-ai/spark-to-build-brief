import { useMemo } from "react";
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Bot, Copy, FileDown, FileSpreadsheet, Printer } from "lucide-react";
import type { IndustryDef } from "@/lib/unit/types";
import { advise } from "@/lib/unit/advisor";
import { exportCsv, exportPdf } from "@/lib/unit/export";
import { cnt, inr, pct } from "@/lib/unit/format";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { InputsPanel } from "./InputsPanel";
import { SCENARIOS, useScenarios } from "./useScenarios";
import { Alerts, CostBreakdown, KpiGrid, RevenueVsCost, Section, Statement, Waterfall, short } from "./Dashboard";

const METRICS = [
  ["Revenue", "Income earned excluding GST and other indirect taxes, after discounts and refunds. Customer collections are higher because they include tax."],
  ["Gross profit", "Revenue minus direct service / fulfilment costs — what is left after delivering the product."],
  ["Contribution", "Gross profit minus variable sales and acquisition costs. Each unit sold contributes this towards fixed costs."],
  ["Operating profit", "Total contribution minus fixed overhead for the period or batch."],
  ["CPL", "Cost per lead: advertising spend ÷ leads generated."],
  ["CAC", "Customer acquisition cost: advertising spend ÷ paying customers it produced. Counted once — never on top of marketing cost already in contribution."],
  ["Break-even units", "Fixed costs ÷ contribution per unit, rounded up. Undefined when contribution per unit is zero or negative."],
];

export function Calculator({ def }: { def: IndustryDef }) {
  const sc = useScenarios(def);
  const r = useMemo(() => def.compute(sc.inputs), [def, sc.inputs]);
  const all = useMemo(() => SCENARIOS.map((s) => ({ ...s, r: def.compute(sc.state[s.key]) })), [def, sc.state]);
  const advice = useMemo(() => advise(def, sc.inputs, r), [def, sc.inputs, r]);
  const scenarioLabel = SCENARIOS.find((s) => s.key === sc.active)?.label ?? "";

  const compareRows: [string, (x: (typeof all)[number]["r"]) => string][] = [
    ["Revenue", (x) => inr(x.revenue)],
    ["Gross profit", (x) => inr(x.grossProfit)],
    ["Contribution", (x) => inr(x.totalContribution)],
    ["Contribution margin", (x) => pct(x.cm)],
    ["CAC", (x) => inr(x.cac)],
    ["Operating profit", (x) => inr(x.operatingProfit)],
    [`Break-even ${r.unitPlural}`, (x) => (x.breakEven === null ? "N/A" : cnt(x.breakEven))],
  ];
  const chartData = ["Revenue", "Gross profit", "Contribution", "Operating profit"].map((m) => {
    const row: Record<string, string | number> = { metric: m };
    all.forEach((s) => (row[s.label] = m === "Revenue" ? s.r.revenue : m === "Gross profit" ? s.r.grossProfit : m === "Contribution" ? s.r.totalContribution : s.r.operatingProfit));
    return row;
  });

  return (
    <div className="grid gap-4 lg:grid-cols-[320px_1fr]">
      <InputsPanel def={def} inputs={sc.inputs} active={sc.active} setActive={sc.setActive} update={sc.update} onReset={sc.resetActive} onExamples={sc.loadExamples} />

      <div className="min-w-0 space-y-4">
        <Section title={`${def.name} · ${scenarioLabel}`} sub={def.tagline}>
          <div className="space-y-4"><KpiGrid r={r} /><Alerts r={r} /></div>
        </Section>

        <div className="grid gap-4 xl:grid-cols-2">
          <Section title="Revenue-to-profit waterfall" sub="How each cost layer erodes revenue"><Waterfall r={r} /></Section>
          <Section title="Cost breakdown" sub="Top expense categories for the period"><CostBreakdown r={r} /></Section>
        </div>

        <div className="grid gap-4 xl:grid-cols-[1.2fr_1fr]">
          <Section title="Financial performance summary" sub="Collections, taxes, revenue and costs kept separate"><Statement r={r} /></Section>
          <Section title="Revenue vs costs vs profit"><RevenueVsCost r={r} /></Section>
        </div>

        <Section title="AI Business Advisor" sub="Rule-based analysis — every figure comes from the calculation engine above, never invented">
          <div className="grid gap-4 md:grid-cols-2">
            <div className={cn("rounded-md border p-4 md:col-span-2", advice.verdict.ok ? "border-positive/30 bg-positive-soft" : "border-negative/30 bg-negative-soft")}>
              <p className="mb-1 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide"><Bot className="h-4 w-4" />Is the business profitable?</p>
              <p className="text-sm">{advice.verdict.text}</p>
            </div>
            <div className="rounded-md border p-4">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-primary">Top three cost drivers</p>
              <ul className="space-y-1.5 text-sm">{advice.drivers.map((d) => <li key={d}>{d}</li>)}</ul>
            </div>
            <div className="rounded-md border border-accent/50 bg-warning-soft p-4">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide">What if CAC increases by 20%?</p>
              <p className="text-sm">{advice.cacTest.text}</p>
            </div>
            <div className="rounded-md border p-4 md:col-span-2">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-primary">Ways to improve profitability</p>
              <ul className="list-disc space-y-1.5 pl-5 text-sm">{advice.levers.map((l) => <li key={l}>{l}</li>)}</ul>
            </div>
          </div>
        </Section>

        <Section title="Scenario comparison" sub="Switch the scenario in the inputs panel to edit its assumptions. Scenarios are saved in this browser.">
          <div className="grid gap-3 md:grid-cols-3">
            {all.map((s) => (
              <div key={s.key} className={cn("rounded-md border p-3", s.key === sc.active && "ring-2 ring-ring")}>
                <div className="mb-2 flex items-center justify-between">
                  <button className="font-display text-base hover:underline" onClick={() => sc.setActive(s.key)}>{s.label}</button>
                  {s.key !== "base" && (
                    <Button variant="ghost" size="sm" className="no-print h-7 px-2 text-xs" onClick={() => sc.copyBaseTo(s.key)}><Copy className="h-3 w-3" />Copy base</Button>
                  )}
                </div>
                <dl className="space-y-1 text-sm">
                  {compareRows.map(([label, f]) => (
                    <div key={label} className="flex justify-between gap-2">
                      <dt className="text-muted-foreground">{label}</dt>
                      <dd className={cn("tnum", label === "Operating profit" && (s.r.operatingProfit >= 0 ? "text-positive" : "text-negative"))}>{f(s.r)}</dd>
                    </div>
                  ))}
                </dl>
              </div>
            ))}
          </div>
          <div className="mt-4 h-72">
            <ResponsiveContainer>
              <BarChart data={chartData} margin={{ left: 0, right: 8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis dataKey="metric" tick={{ fontSize: 11 }} />
                <YAxis tickFormatter={short} tick={{ fontSize: 11 }} width={60} />
                <Tooltip formatter={(v) => inr(Number(v))} contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 6 }} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="Base Case" fill="var(--chart-1)" radius={[3, 3, 0, 0]} />
                <Bar dataKey="Best Case" fill="var(--chart-3)" radius={[3, 3, 0, 0]} />
                <Bar dataKey="Worst Case" fill="var(--chart-4)" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Section>

        <Section title="Export & reporting" sub={`Exports the ${scenarioLabel} for ${def.name}, including assumptions, results, advisor notes and formulas`} className="no-print">
          <div className="flex flex-wrap gap-2">
            <Button onClick={() => exportCsv(def, scenarioLabel, sc.inputs, r)}><FileSpreadsheet className="h-4 w-4" />Export CSV</Button>
            <Button variant="secondary" onClick={() => void exportPdf(def, scenarioLabel, sc.inputs, r)}><FileDown className="h-4 w-4" />Export PDF</Button>
            <Button variant="outline" onClick={() => window.print()}><Printer className="h-4 w-4" />Print report</Button>
          </div>
        </Section>

        <Section title="Formulas & methodology" sub="Explicit deterministic formulas used by this calculator">
          <div className="grid gap-6 xl:grid-cols-2">
            <table className="w-full text-sm">
              <thead><tr className="border-b text-left text-xs uppercase tracking-wide text-muted-foreground"><th className="py-1.5">Metric</th><th className="py-1.5">Formula</th></tr></thead>
              <tbody>{def.methodology.map((m) => <tr key={m.metric} className="border-b last:border-0 align-top"><td className="py-1.5 pr-3 font-medium">{m.metric}</td><td className="tnum py-1.5 text-xs">{m.formula}</td></tr>)}</tbody>
            </table>
            <dl className="space-y-2 text-sm">
              {METRICS.map(([k, v]) => <div key={k}><dt className="font-medium">{k}</dt><dd className="text-muted-foreground">{v}</dd></div>)}
            </dl>
          </div>
        </Section>
      </div>
    </div>
  );
}
