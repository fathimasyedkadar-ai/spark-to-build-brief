import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { GraduationCap, Building2, Plane } from "lucide-react";
import { INDUSTRIES } from "@/lib/unit/engine";
import type { IndustryId } from "@/lib/unit/types";
import { Calculator } from "@/components/unit/Calculator";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Unit Economics AI Calculator — Education, Real Estate, Travel" },
      { name: "description", content: "Interactive unit economics dashboards with KPIs, waterfall charts, scenarios and an advisor for Education, Real Estate and Travel businesses." },
      { property: "og:title", content: "Unit Economics AI Calculator" },
      { property: "og:description", content: "Revenue, contribution, CAC and break-even analysis for three business models, in ₹." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

const TABS: { id: IndustryId; icon: typeof Plane }[] = [
  { id: "education", icon: GraduationCap },
  { id: "realEstate", icon: Building2 },
  { id: "travel", icon: Plane },
];

function Index() {
  const [tab, setTab] = useState<IndustryId>("education");
  return (
    <div className="min-h-screen">
      <header className="masthead text-primary-foreground">
        <div className="mx-auto max-w-[1440px] px-4 pb-0 pt-6 sm:px-6">
          <p className="text-xs uppercase tracking-[0.2em] opacity-70">PM assignment · Financial analytics</p>
          <h1 className="font-display text-3xl font-bold sm:text-4xl">Unit Economics AI Calculator</h1>
          <p className="mt-1 max-w-2xl text-sm opacity-80">Three independent calculators. Every number is computed live from your assumptions using explicit formulas.</p>
          <nav className="no-print mt-5 flex gap-1 overflow-x-auto" role="tablist">
            {TABS.map(({ id, icon: Icon }) => (
              <button key={id} role="tab" aria-selected={tab === id} onClick={() => setTab(id)}
                className={cn("flex items-center gap-2 whitespace-nowrap rounded-t-md px-4 py-2.5 text-sm font-medium transition",
                  tab === id ? "bg-background text-foreground" : "text-primary-foreground/75 hover:bg-primary-foreground/10")}>
                <Icon className="h-4 w-4" />{INDUSTRIES[id].name}
              </button>
            ))}
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-[1440px] px-4 py-5 sm:px-6">
        {TABS.map(({ id }) => (
          <div key={id} hidden={tab !== id}><Calculator def={INDUSTRIES[id]} /></div>
        ))}
      </main>
    </div>
  );
}
