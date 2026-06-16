import type { Metadata } from "next";

import { StateExplorer } from "@/components/states/state-explorer";
import { getStates } from "@/lib/data";

export const metadata: Metadata = {
  title: "State Explorer",
  description: "Interactive US map of employment, wages, growth, and AI exposure by state.",
};

export default function StatesPage() {
  const states = getStates();
  return (
    <div className="container py-8">
      <header className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight">State Explorer</h1>
        <p className="mt-1 max-w-2xl text-muted-foreground">
          Recolour the map by metric and click any state to see its labor
          snapshot and top occupations.
        </p>
      </header>
      <StateExplorer states={states} />
      <p className="mt-4 text-xs text-muted-foreground">
        State figures are modelled from national OEWS data scaled by each
        state&apos;s employment and wage indices. Wire in the BLS state-level
        OEWS release via the ETL pipeline for official per-state numbers.
      </p>
    </div>
  );
}
