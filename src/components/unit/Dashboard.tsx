import { Bar, BarChart, CartesianGrid, Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { AlertTriangle, CheckCircle2, Info, TrendingDown, TrendingUp } from "lucide-react";
import type { Result } from "@/lib/unit/types";
import { cnt, fmt, inr, pct } from "@/lib/unit/format";
import { cn } from "@/lib/utils";

const COLORS = ["var(--chart-1)", "var(--chart-2)", "var(--chart-3)", "var(--chart-4)", "var(--chart-5)", "var(--accent)", "var(--muted-foreground)", "var(--primary)"];
const short = (v: number) => {
  const a = Math.abs(v), s = v < 0 ? "−" : "";
  return a >= 1e7 ? `${s}₹${(a / 1e7).toFixed(1)}Cr` : a >= 1e5 ? `${s}₹${(a / 1e5).toFixed(1)}L` : a >= 1e3 ? `${s}₹${(a / 1e3).toFixed(0)}k` : `${s}₹${a.toFixed(0)}`;
};

export function Section({ title, sub, children, className }: { title: string; sub?: string; children: React.ReactNode; className?: string }) {
  return (
    <section className={cn("print-break rounded-lg border bg-card p-4 shadow-card sm:p-5", className)}>
      <h2 className="font-display text-xl">{title}</h2>
      {sub && <p className="mb-4 text-sm text-muted-foreground">{sub}</p>}
      {!sub && <div className="mb-4" />}
      {children}
    </section>
  );
}

function Kpi({ label, value, tone, sub }: { label: string; value: string; tone?: "pos" | "neg" | undefined; sub?: string }) {
  return (
    <div className={cn("rounded-md border p-3", tone === "pos" && "border-positive/30 bg-positive-soft", tone === "neg" && "border-negative/30 bg-negative-soft")}>
      <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className={cn("tnum mt-1 text-lg font-medium sm:text-xl", tone === "pos" && "text-positive", tone === "neg" && "text-negative")}>{value}</p>
      {sub && <p className="mt-0.5 text-[11px] text-muted-foreground">{sub}</p>}
    </div>
  );
}

const tone = (v: number | null) => (v === null ? undefined : v > 0 ? "pos" : v < 0 ? "neg" : undefined);

export function KpiGrid({ r }: { r: Result }) {
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-5">
      <Kpi label="Revenue" value={inr(r.revenue)} sub="Excl. taxes, net of refunds" />
      <Kpi label="Gross profit" value={inr(r.grossProfit)} tone={tone(r.grossProfit)} />
      <Kpi label="Gross margin" value={pct(r.gpMargin)} />
      <Kpi label="Total contribution" value={inr(r.totalContribution)} tone={tone(r.totalContribution)} />
      <Kpi label="Contribution margin" value={pct(r.cm)} />
      <Kpi label={r.operatingProfit < 0 ? "Operating loss" : "Operating profit"} value={inr(r.operatingProfit)} tone={tone(r.operatingProfit)} />
      <Kpi label="Operating margin" value={pct(r.opMargin)} tone={tone(r.opMargin)} />
      <Kpi label="CAC" value={inr(r.cac)} sub={`per ${r.unitLabel}`} />
      <Kpi label="CPL" value={inr(r.cpl)} sub="per lead" />
      <Kpi label={`Break-even ${r.unitPlural}`} value={r.breakEven === null ? "Not achievable" : cnt(r.breakEven)} tone={r.breakEven === null ? "neg" : r.breakEven <= r.units ? "pos" : "neg"} sub={`current: ${cnt(r.units)}`} />
    </div>
  );
}

export function Alerts({ r }: { r: Result }) {
  return (
    <div className="space-y-2">
      {r.operatingProfit > 0 && r.warnings.length === 0 && (
        <div className="flex items-start gap-2 rounded-md border border-positive/30 bg-positive-soft p-3 text-sm">
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-positive" />
          <span>Profitable: {inr(r.operatingProfit)} operating profit after all fixed costs. Margin of safety: {r.breakEven !== null ? `${cnt(r.units - r.breakEven)} ${r.unitPlural} above break-even.` : "—"}</span>
        </div>
      )}
      {r.warnings.map((w) => (
        <div key={w} className="flex items-start gap-2 rounded-md border border-negative/30 bg-negative-soft p-3 text-sm">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-negative" /><span>{w}</span>
        </div>
      ))}
    </div>
  );
}

export function Waterfall({ r }: { r: Result }) {
  const steps: { name: string; delta?: number; total?: number }[] = [
    { name: "Revenue", total: r.revenue },
    { name: "Direct", delta: -r.directCost },
    { name: "Gross", total: r.grossProfit },
    { name: "Acquire", delta: -(r.grossProfit - r.totalContribution) },
    { name: "Contrib.", total: r.totalContribution },
    { name: "Fixed", delta: -(r.fixedOverhead + r.additionalExpenses) },
    { name: "Op. profit", total: r.operatingProfit },
  ];
  let run = 0;
  const data = steps.map((s) => {
    if (s.total !== undefined) { run = s.total; return { name: s.name, range: [0, s.total], v: s.total, kind: s.total >= 0 ? "total" : "neg" }; }
    const from = run; run += s.delta ?? 0;
    return { name: s.name, range: [Math.min(from, run), Math.max(from, run)], v: s.delta ?? 0, kind: "down" };
  });
  return (
    <div className="h-72">
      <ResponsiveContainer>
        <BarChart data={data} margin={{ left: 0, right: 8, top: 8 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
          <XAxis dataKey="name" tick={{ fontSize: 11 }} interval={0} />
          <YAxis tickFormatter={short} tick={{ fontSize: 11 }} width={60} />
          <Tooltip formatter={(_v, _n, p) => inr((p.payload as { v: number }).v)} contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 6 }} />
          <Bar dataKey="range" radius={[3, 3, 0, 0]}>
            {data.map((d) => <Cell key={d.name} fill={d.kind === "total" ? "var(--chart-1)" : d.kind === "neg" ? "var(--negative)" : "var(--chart-2)"} />)}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function CostBreakdown({ r }: { r: Result }) {
  const sorted = [...r.costs].sort((a, b) => b.value - a.value);
  const total = sorted.reduce((s, c) => s + c.value, 0);
  if (!total) return <p className="text-sm text-muted-foreground">No costs entered.</p>;
  return (
    <div className="grid gap-4 sm:grid-cols-[180px_1fr] sm:items-center">
      <div className="h-44">
        <ResponsiveContainer>
          <PieChart>
            <Pie data={sorted} dataKey="value" nameKey="name" innerRadius={45} outerRadius={80} paddingAngle={1} stroke="var(--card)">
              {sorted.map((c, idx) => <Cell key={c.name} fill={COLORS[idx % COLORS.length]} />)}
            </Pie>
            <Tooltip formatter={(v) => inr(Number(v))} contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 6 }} />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <ol className="space-y-1.5 text-sm">
        {sorted.map((c, idx) => (
          <li key={c.name} className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 shrink-0 rounded-sm" style={{ background: COLORS[idx % COLORS.length] }} />
            <span className="flex-1">{c.name}</span>
            <span className="tnum text-muted-foreground">{((c.value / total) * 100).toFixed(0)}%</span>
            <span className="tnum w-24 text-right">{inr(c.value)}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}

export function Statement({ r }: { r: Result }) {
  return (
    <div className="space-y-4">
      <table className="w-full text-sm">
        <tbody>
          {r.lines.map((l) => (
            <tr key={l.label} className={cn("border-b last:border-0", l.kind === "profit" && "font-semibold", l.kind === "tax" && "text-muted-foreground")}>
              <td className="py-1.5 pr-2">{l.label}</td>
              <td className={cn("tnum py-1.5 text-right", l.value < 0 && "text-negative")}>{inr(l.value)}</td>
            </tr>
          ))}
          <tr className="border-b"><td className="py-1.5">Less: fixed overhead</td><td className="tnum py-1.5 text-right text-negative">{inr(-r.fixedOverhead)}</td></tr>
          {r.additionalExpenses > 0 && <tr className="border-b"><td className="py-1.5">Less: additional expenses</td><td className="tnum py-1.5 text-right text-negative">{inr(-r.additionalExpenses)}</td></tr>}
          <tr className="border-b font-semibold"><td className="py-2 flex items-center gap-1.5">{r.operatingProfit >= 0 ? <TrendingUp className="h-4 w-4 text-positive" /> : <TrendingDown className="h-4 w-4 text-negative" />}Operating profit / loss</td><td className={cn("tnum py-2 text-right", r.operatingProfit >= 0 ? "text-positive" : "text-negative")}>{inr(r.operatingProfit)}</td></tr>
          {r.incomeTax > 0 && <tr className="border-b"><td className="py-1.5">Less: estimated income tax</td><td className="tnum py-1.5 text-right text-negative">{inr(-r.incomeTax)}</td></tr>}
          <tr><td className="py-1.5">Profit after tax</td><td className="tnum py-1.5 text-right">{inr(r.profitAfterTax)}</td></tr>
        </tbody>
      </table>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {r.extraKpis.map((k) => (
          <div key={k.label} className="rounded-md bg-muted p-2.5">
            <p className="text-[11px] text-muted-foreground">{k.label}</p>
            <p className="tnum text-sm font-medium">{fmt(k.value, k.format)}</p>
          </div>
        ))}
      </div>
      <ul className="space-y-1.5">
        {r.notes.map((n) => <li key={n} className="flex gap-2 text-xs text-muted-foreground"><Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />{n}</li>)}
      </ul>
    </div>
  );
}

export function RevenueVsCost({ r }: { r: Result }) {
  const totalCost = r.costs.reduce((s, c) => s + c.value, 0);
  const data = [
    { name: "Collections", v: r.collections },
    { name: "Taxes", v: r.taxCollected },
    { name: "Revenue", v: r.revenue },
    { name: "Total costs", v: totalCost },
    { name: "Profit", v: r.operatingProfit },
  ];
  return (
    <div className="h-56">
      <ResponsiveContainer>
        <BarChart data={data} layout="vertical" margin={{ left: 10, right: 16 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" horizontal={false} />
          <XAxis type="number" tickFormatter={short} tick={{ fontSize: 11 }} />
          <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={80} />
          <Tooltip formatter={(v) => inr(Number(v))} contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 6 }} />
          <Bar dataKey="v" radius={[0, 3, 3, 0]}>
            {data.map((d, idx) => <Cell key={d.name} fill={d.name === "Profit" ? (d.v >= 0 ? "var(--positive)" : "var(--negative)") : COLORS[idx]} />)}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export { short, COLORS, Legend };
