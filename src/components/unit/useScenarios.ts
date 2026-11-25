import { useEffect, useState } from "react";
import type { IndustryDef, Inputs } from "@/lib/unit/types";

export type ScenarioKey = "base" | "best" | "worst";
export const SCENARIOS: { key: ScenarioKey; label: string }[] = [
  { key: "base", label: "Base Case" },
  { key: "best", label: "Best Case" },
  { key: "worst", label: "Worst Case" },
];
type State = Record<ScenarioKey, Inputs>;

export const exampleState = (def: IndustryDef): State => ({
  base: { ...def.defaults },
  best: def.best(def.defaults),
  worst: def.worst(def.defaults),
});

export function useScenarios(def: IndustryDef) {
  const storeKey = `uecalc:${def.id}`;
  const [state, setState] = useState<State>(() => exampleState(def));
  const [active, setActive] = useState<ScenarioKey>("base");
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(storeKey);
      if (raw) {
        const saved = JSON.parse(raw) as Partial<State>;
        const ex = exampleState(def);
        setState({ base: { ...ex.base, ...saved.base }, best: { ...ex.best, ...saved.best }, worst: { ...ex.worst, ...saved.worst } });
      }
    } catch {
      /* ignore corrupt storage */
    }
    setLoaded(true);
  }, [storeKey, def]);

  useEffect(() => {
    if (loaded) localStorage.setItem(storeKey, JSON.stringify(state));
  }, [state, loaded, storeKey]);

  return {
    state,
    active,
    setActive,
    inputs: state[active],
    update: (key: string, value: number | string) => setState((s) => ({ ...s, [active]: { ...s[active], [key]: value } })),
    resetActive: () => setState((s) => ({ ...s, [active]: exampleState(def)[active] })),
    loadExamples: () => setState(exampleState(def)),
    copyBaseTo: (k: ScenarioKey) => setState((s) => ({ ...s, [k]: { ...s.base } })),
  };
}
