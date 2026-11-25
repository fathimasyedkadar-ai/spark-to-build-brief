import type { IndustryDef, Inputs, Result } from "./types";
import { fmt, inr, pct } from "./format";
import { advise } from "./advisor";

function kpiRows(r: Result): [string, string][] {
  return [
    ["Customer collections", inr(r.collections)],
    ["Taxes collected (not revenue)", inr(r.taxCollected)],
    ["Revenue", inr(r.revenue)],
    ["Gross profit", inr(r.grossProfit)],
    ["Gross profit margin", pct(r.gpMargin)],
    ["Total contribution", inr(r.totalContribution)],
    ["Contribution margin", pct(r.cm)],
    ["Fixed overhead", inr(r.fixedOverhead)],
    ["Additional expenses", inr(r.additionalExpenses)],
    ["Operating profit / loss", inr(r.operatingProfit)],
    ["Operating profit margin", pct(r.opMargin)],
    ["Estimated income tax", inr(r.incomeTax)],
    ["Profit after tax", inr(r.profitAfterTax)],
    ["CAC", inr(r.cac)],
    ["CPL", inr(r.cpl)],
    [`Break-even ${r.unitPlural}`, r.breakEven === null ? "Not achievable" : String(r.breakEven)],
    ...r.extraKpis.map((k) => [k.label, fmt(k.value, k.format)] as [string, string]),
  ];
}

function inputRows(def: IndustryDef, i: Inputs): [string, string][] {
  return def.fields.map((f) => [
    f.label,
    f.kind === "select" ? (f.options?.find((o) => o.value === i[f.key])?.label ?? String(i[f.key])) : f.kind === "currency" ? inr(Number(i[f.key]) || 0) : f.kind === "percent" ? `${i[f.key]}%` : String(i[f.key]),
  ]);
}

const esc = (s: string) => `"${s.replace(/"/g, '""')}"`;

export function exportCsv(def: IndustryDef, scenario: string, i: Inputs, r: Result) {
  const rows: string[][] = [["Unit Economics AI Calculator", def.name, scenario], [], ["ASSUMPTIONS"], ...inputRows(def, i), [], ["RESULTS"], ...kpiRows(r), [], ["FORMULAS"], ...def.methodology.map((m) => [m.metric, m.formula])];
  const blob = new Blob(["\uFEFF" + rows.map((row) => row.map(esc).join(",")).join("\n")], { type: "text/csv;charset=utf-8" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `${def.id}-${scenario.toLowerCase().replace(/\s+/g, "-")}-summary.csv`;
  a.click();
  URL.revokeObjectURL(a.href);
}

export async function exportPdf(def: IndustryDef, scenario: string, i: Inputs, r: Result) {
  const [{ jsPDF }, { default: autoTable }] = await Promise.all([import("jspdf"), import("jspdf-autotable")]);
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  // jsPDF's built-in fonts lack the rupee glyph
  const t = (s: string) => s.replace(/₹/g, "Rs ").replace(/−/g, "-");
  doc.setFontSize(18);
  doc.text("Unit Economics AI Calculator", 40, 50);
  doc.setFontSize(11);
  doc.text(t(`${def.name} — ${scenario} · ${new Date().toLocaleDateString("en-IN")}`), 40, 70);
  const head = { fillColor: [24, 52, 64] as [number, number, number] };
  autoTable(doc, { startY: 90, head: [["Financial summary", "Value"]], body: kpiRows(r).map((x) => x.map(t)), headStyles: head, styles: { fontSize: 9 } });
  autoTable(doc, { head: [["Assumption", "Value"]], body: inputRows(def, i).map((x) => x.map(t)), headStyles: head, styles: { fontSize: 9 } });
  const a = advise(def, i, r);
  autoTable(doc, { head: [["Advisor"]], body: [[a.verdict.text], ...a.drivers.map((d) => [d]), [a.cacTest.text], ...a.levers.map((l) => [l])].map((x) => x.map(t)), headStyles: head, styles: { fontSize: 9 } });
  autoTable(doc, { head: [["Metric", "Formula"]], body: def.methodology.map((m) => [m.metric, m.formula]), headStyles: head, styles: { fontSize: 9 } });
  doc.save(`${def.id}-${scenario.toLowerCase().replace(/\s+/g, "-")}-report.pdf`);
}
