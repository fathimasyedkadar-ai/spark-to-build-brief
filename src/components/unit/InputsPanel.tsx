import type { FieldDef, IndustryDef, Inputs } from "@/lib/unit/types";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { RotateCcw, Sparkles } from "lucide-react";
import { SCENARIOS, type ScenarioKey } from "./useScenarios";
import { cn } from "@/lib/utils";

interface Props {
  def: IndustryDef;
  inputs: Inputs;
  active: ScenarioKey;
  setActive: (k: ScenarioKey) => void;
  update: (k: string, v: number | string) => void;
  onReset: () => void;
  onExamples: () => void;
}

function Field({ f, value, update }: { f: FieldDef; value: number | string | undefined; update: Props["update"] }) {
  const id = `f-${f.key}`;
  if (f.kind === "select") {
    return (
      <div className="space-y-1">
        <Label htmlFor={id} className="text-xs text-muted-foreground">{f.label}</Label>
        <select id={id} value={String(value)} onChange={(e) => update(f.key, e.target.value)}
          className="h-9 w-full rounded-md border border-input bg-card px-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
          {f.options?.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      </div>
    );
  }
  const num = Number(value);
  const invalid = value === "" || !Number.isFinite(num) || num < 0 || (f.kind === "percent" && num > 100);
  return (
    <div className="space-y-1">
      <Label htmlFor={id} className="text-xs text-muted-foreground">{f.label}</Label>
      <div className="relative">
        {f.kind === "currency" && <span className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">₹</span>}
        <Input id={id} type="number" inputMode="decimal" min={0} step="any" value={value ?? ""}
          aria-invalid={invalid}
          onChange={(e) => update(f.key, e.target.value === "" ? "" : Number(e.target.value))}
          className={cn("tnum h-9 bg-card", f.kind === "currency" && "pl-6", f.kind === "percent" && "pr-7", invalid && "border-destructive")} />
        {f.kind === "percent" && <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">%</span>}
      </div>
      {invalid ? <p className="text-[11px] text-destructive">{f.kind === "percent" ? "Enter 0–100" : "Enter a number ≥ 0 (blank counts as 0)"}</p>
        : f.hint && <p className="text-[11px] leading-snug text-muted-foreground">{f.hint}</p>}
    </div>
  );
}

export function InputsPanel({ def, inputs, active, setActive, update, onReset, onExamples }: Props) {
  const groups = [...new Set(def.fields.map((f) => f.group))];
  return (
    <aside className="no-print rounded-lg border bg-card shadow-card lg:sticky lg:top-4 lg:max-h-[calc(100vh-2rem)] lg:overflow-y-auto">
      <div className="border-b p-4">
        <p className="font-display text-lg">Business inputs</p>
        <p className="mb-3 text-xs text-muted-foreground">Editing scenario:</p>
        <div className="grid grid-cols-3 gap-1 rounded-md bg-muted p-1">
          {SCENARIOS.map((s) => (
            <button key={s.key} onClick={() => setActive(s.key)}
              className={cn("rounded px-2 py-1.5 text-xs font-medium transition", active === s.key ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground")}>
              {s.label}
            </button>
          ))}
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <Button variant="outline" size="sm" onClick={onReset}><RotateCcw className="h-3.5 w-3.5" />Reset to default</Button>
          <Button variant="secondary" size="sm" onClick={onExamples}><Sparkles className="h-3.5 w-3.5" />Load examples</Button>
        </div>
      </div>
      <div className="space-y-5 p-4">
        {groups.map((g) => (
          <fieldset key={g} className="space-y-3">
            <legend className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-primary">{g}</legend>
            {def.fields.filter((f) => f.group === g).map((f) => <Field key={f.key} f={f} value={inputs[f.key]} update={update} />)}
          </fieldset>
        ))}
      </div>
    </aside>
  );
}
