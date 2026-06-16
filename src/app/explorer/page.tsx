import type { Metadata } from "next";

import { OccupationExplorer } from "@/components/explorer/occupation-explorer";
import { getEducationLevels, getMajorGroups, getOccupations } from "@/lib/data";

export const metadata: Metadata = {
  title: "Occupation Explorer",
  description: "Search and filter US occupations by pay, jobs, growth, education, demand, and AI impact.",
};

export default function ExplorerPage() {
  const occupations = getOccupations();
  const majorGroups = getMajorGroups();
  const educationLevels = getEducationLevels();

  return (
    <div className="container py-8">
      <header className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight">Occupation Explorer</h1>
        <p className="mt-1 text-muted-foreground">
          Search by title, SOC code, or industry, then filter by salary,
          employment size, AI exposure, growth, and education.
        </p>
      </header>
      <OccupationExplorer
        occupations={occupations}
        majorGroups={majorGroups}
        educationLevels={educationLevels}
      />
    </div>
  );
}
