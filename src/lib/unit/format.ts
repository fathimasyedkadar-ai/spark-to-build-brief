export const inr = (v: number | null, digits = 0) =>
  v === null || !Number.isFinite(v)
    ? "—"
    : `${v < 0 ? "−" : ""}₹${Math.abs(v).toLocaleString("en-IN", { maximumFractionDigits: digits, minimumFractionDigits: 0 })}`;
export const pct = (v: number | null) => (v === null || !Number.isFinite(v) ? "—" : `${v.toFixed(1)}%`);
export const cnt = (v: number | null) => (v === null || !Number.isFinite(v) ? "—" : v.toLocaleString("en-IN", { maximumFractionDigits: 1 }));
export const fmt = (v: number | null, f: "currency" | "percent" | "count") => (f === "currency" ? inr(v) : f === "percent" ? pct(v) : cnt(v));
