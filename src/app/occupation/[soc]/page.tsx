import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ImpactBadge } from "@/components/metrics/impact-badge";
import { DemandBadge } from "@/components/metrics/demand-badge";
import { OutlookDot } from "@/components/metrics/outlook-dot";
import { WageDistribution } from "@/components/charts/wage-distribution";
import { ExposureBreakdown } from "@/components/charts/exposure-breakdown";
import { getOccupationBySoc, getOccupations } from "@/lib/data";
import { aiImpact, careerExplanation, demandStrength, outlook } from "@/lib/metrics";
import { formatCompact, formatCurrency, formatNumber, formatPercent } from "@/lib/format";

export function generateStaticParams() {
  return getOccupations().map((o) => ({ soc: o.soc_code }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ soc: string }>;
}): Promise<Metadata> {
  const { soc } = await params;
  const occ = getOccupationBySoc(soc);
  if (!occ) return { title: "Occupation not found" };
  return { title: occ.title, description: careerExplanation(occ) };
}

export default async function OccupationPage({
  params,
}: {
  params: Promise<{ soc: string }>;
}) {
  const { soc } = await params;
  const occ = getOccupationBySoc(soc);
  if (!occ) notFound();

  const related = getOccupations()
    .filter((o) => o.major_group === occ.major_group && o.soc_code !== occ.soc_code)
    .slice(0, 4);

  const impact = aiImpact(occ);
  const demand = demandStrength(occ);
  const out = outlook(occ.growth_rate);
  const augLeads = occ.ai_augmentation_score >= occ.ai_automation_score;

  return (
    <div className="container max-w-5xl py-8">
      <Link
        href="/explorer"
        className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Back to explorer
      </Link>

      {/* Header */}
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Badge variant="secondary">{occ.soc_code}</Badge>
            <span className="text-sm text-muted-foreground">{occ.major_group_title}</span>
          </div>
          <h1 className="mt-2 text-3xl font-bold tracking-tight">{occ.title}</h1>
          <p className="mt-2 max-w-2xl text-muted-foreground">{occ.description}</p>
        </div>
        <div className="flex flex-col items-end gap-2">
          <ImpactBadge occ={occ} />
          <DemandBadge occ={occ} />
        </div>
      </div>

      {/* Career Snapshot */}
      <Card className="mb-6">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Career Snapshot</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-5">
            <Snapshot label="Salary" value={formatCurrency(occ.median_wage)} sub="median, per year" />
            <Snapshot label="Demand" value={demand.level} sub="employer need" />
            <Snapshot label="AI Impact" value={impact.level} sub="how work may change" />
            <Snapshot label="Education" value={shortEdu(occ.education)} sub="to enter" />
            <Snapshot
              label="Outlook"
              value={out.label}
              sub={formatPercent(occ.growth_rate)}
              dot={<OutlookDot growthRate={occ.growth_rate} />}
            />
          </div>
          <p className="rounded-lg border bg-muted/30 p-4 text-sm leading-relaxed">
            {careerExplanation(occ)}
          </p>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Pay range */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Pay range</CardTitle>
          </CardHeader>
          <CardContent>
            <WageDistribution occ={occ} />
            <div className="mt-2 grid grid-cols-3 gap-2 text-center text-xs text-muted-foreground">
              <span>Lower {formatCurrency(occ.wage_p10)}</span>
              <span>Median {formatCurrency(occ.median_wage)}</span>
              <span>Higher {formatCurrency(occ.wage_p90)}</span>
            </div>
          </CardContent>
        </Card>

        {/* AI Impact detail */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">How AI may affect this work</CardTitle>
          </CardHeader>
          <CardContent>
            <ExposureBreakdown occ={occ} />
            <p className="mt-2 text-xs text-muted-foreground">
              {augLeads
                ? "AI is more likely to assist workers than to replace tasks in this field."
                : "A larger share of tasks could be automated, though people typically stay involved."}{" "}
              This reflects how the work may change, not job loss.
            </p>
          </CardContent>
        </Card>

        {/* Projections */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Job growth (2024 to 2034)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <Row label="Jobs today" value={formatNumber(occ.employment)} />
            <Row label="Projected jobs" value={formatNumber(occ.projected_employment)} />
            <Row label="Change" value={`${formatPercent(occ.growth_rate)} (${formatCompact(occ.projected_employment - occ.employment)})`} />
            <Row label="Openings per year" value={formatNumber(occ.annual_openings)} />
          </CardContent>
        </Card>

        {/* Skills & knowledge */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Skills and knowledge</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="mb-2 text-xs font-medium uppercase text-muted-foreground">Top skills</p>
              <div className="flex flex-wrap gap-1.5">
                {occ.skills.map((s) => (
                  <Badge key={s} variant="secondary">{s}</Badge>
                ))}
              </div>
            </div>
            <div>
              <p className="mb-2 text-xs font-medium uppercase text-muted-foreground">Knowledge areas</p>
              <div className="flex flex-wrap gap-1.5">
                {occ.knowledge.map((k) => (
                  <Badge key={k} variant="outline">{k}</Badge>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Related */}
      {related.length > 0 && (
        <section className="mt-8">
          <h2 className="mb-3 text-lg font-semibold">Related occupations</h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {related.map((o) => (
              <Link key={o.soc_code} href={`/occupation/${o.soc_code}`}>
                <Card className="h-full transition-colors hover:border-primary/40">
                  <CardContent className="p-4">
                    <span className="flex items-center gap-2">
                      <OutlookDot growthRate={o.growth_rate} />
                      <span className="text-sm font-medium leading-tight">{o.title}</span>
                    </span>
                    <p className="mt-1 pl-[18px] text-xs text-muted-foreground">
                      {formatCurrency(o.median_wage)} · {formatPercent(o.growth_rate)}
                    </p>
                    <div className="mt-2 pl-[18px]">
                      <ImpactBadge occ={o} />
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function Snapshot({
  label,
  value,
  sub,
  dot,
}: {
  label: string;
  value: string;
  sub?: string;
  dot?: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-0.5 flex items-center gap-1.5 text-base font-semibold leading-tight">
        {dot}
        {value}
      </p>
      {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between border-b pb-2 last:border-0 last:pb-0">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium tabular-nums">{value}</span>
    </div>
  );
}

function shortEdu(edu: string): string {
  const map: Record<string, string> = {
    "No formal educational credential": "None",
    "High school diploma or equivalent": "High school",
    "Some college, no degree": "Some college",
    "Postsecondary nondegree award": "Postsec. award",
    "Associate's degree": "Associate's",
    "Bachelor's degree": "Bachelor's",
    "Master's degree": "Master's",
    "Doctoral or professional degree": "Doctoral/prof.",
  };
  return map[edu] ?? edu;
}
