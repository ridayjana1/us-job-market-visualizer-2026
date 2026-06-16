import Link from "next/link";
import {
  ArrowRight,
  Briefcase,
  Building2,
  DollarSign,
  Map as MapIcon,
  ScatterChart,
  Sparkles,
  TrendingUp,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { StatCard } from "@/components/stat-card";
import { ExposureBadge } from "@/components/exposure-badge";
import { getMeta, getSummaryStats, getTrends } from "@/lib/data";
import { formatCompact, formatCurrency, formatPercent } from "@/lib/format";

export default function HomePage() {
  const stats = getSummaryStats();
  const meta = getMeta();
  const trends = getTrends(5);

  const features = [
    { href: "/explorer", icon: Briefcase, title: "Occupation Explorer", desc: "Search and filter by wage, employment, exposure, growth, and education." },
    { href: "/scatter", icon: ScatterChart, title: "Exposure × Wage", desc: "Bubble chart: exposure vs. salary, sized by employment, coloured by growth." },
    { href: "/ai-exposure", icon: Sparkles, title: "AI Exposure Map", desc: "Augmentation vs. automation potential - not a job-loss forecast." },
    { href: "/states", icon: MapIcon, title: "State Explorer", desc: "Interactive US map with per-state wages, growth, and exposure." },
    { href: "/trends", icon: TrendingUp, title: "Trend Dashboard", desc: "Fastest-growing, highest-paying, and most/least AI-exposed roles." },
    { href: "/data-sources", icon: Building2, title: "Data & Methodology", desc: "BLS, O*NET, and the Anthropic Economic Index framing." },
  ];

  return (
    <div>
      {/* Hero */}
      <section className="relative border-b">
        <div className="absolute inset-0 bg-grid" aria-hidden />
        <div className="container relative py-16 md:py-24">
          <div className="mx-auto max-w-3xl text-center">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border bg-background/60 px-3 py-1 text-xs text-muted-foreground">
              <Sparkles className="h-3.5 w-3.5" />
              {meta.reference_year} BLS &amp; O*NET
            </div>
            <h1 className="text-4xl font-bold tracking-tight md:text-6xl">
              Explore the US job market
            </h1>
            <p className="mt-5 text-lg text-muted-foreground md:text-xl">
              Employment, wages, growth, education, and AI exposure for{" "}
              {stats.occupationCount} occupations - in one interactive workspace.
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <Button asChild size="lg">
                <Link href="/explorer">Start exploring <ArrowRight className="h-4 w-4" /></Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link href="/scatter">View the scatter plot</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      <div className="container space-y-12 py-12">
        {/* Top stats */}
        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard icon={Briefcase} label="Occupations" value={String(stats.occupationCount)} sublabel="detailed SOC codes" />
          <StatCard icon={Building2} label="Total employment" value={formatCompact(stats.totalEmployment)} sublabel="workers covered" />
          <StatCard icon={DollarSign} label="Employment-weighted wage" value={formatCurrency(stats.weightedMedianWage)} sublabel="median, annual" />
          <StatCard icon={TrendingUp} label="Fastest growing" value={formatPercent(stats.fastestGrowing.growth_rate)} sublabel={stats.fastestGrowing.title} />
        </section>

        {/* AI exposure note */}
        <Card className="border-primary/20 bg-primary/[0.03]">
          <CardContent className="flex flex-col gap-3 p-6 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="font-semibold">AI exposure is about task overlap - not job loss</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Each occupation&apos;s exposure is split into augmentation and automation
                potential, following the Anthropic Economic Index framing.
              </p>
            </div>
            <Button asChild variant="outline">
              <Link href="/ai-exposure">See the exposure map <ArrowRight className="h-4 w-4" /></Link>
            </Button>
          </CardContent>
        </Card>

        {/* Feature grid */}
        <section>
          <h2 className="mb-5 text-2xl font-semibold tracking-tight">What you can do</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((f) => (
              <Link key={f.href} href={f.href} className="group">
                <Card className="h-full transition-colors group-hover:border-primary/40">
                  <CardHeader>
                    <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <f.icon className="h-5 w-5" />
                    </div>
                    <CardTitle className="text-base">{f.title}</CardTitle>
                    <CardDescription>{f.desc}</CardDescription>
                  </CardHeader>
                </Card>
              </Link>
            ))}
          </div>
        </section>

        {/* Quick trends */}
        <section className="grid gap-6 lg:grid-cols-2">
          <TrendList title="Fastest growing" occ={trends.fastestGrowing} valueFn={(o) => formatPercent(o.growth_rate)} />
          <TrendList title="Highest paying" occ={trends.highestPaying} valueFn={(o) => formatCurrency(o.median_wage)} />
        </section>
      </div>
    </div>
  );
}

function TrendList({
  title,
  occ,
  valueFn,
}: {
  title: string;
  occ: ReturnType<typeof getTrends>["fastestGrowing"];
  valueFn: (o: (typeof occ)[number]) => string;
}) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent className="divide-y">
        {occ.map((o, i) => (
          <Link
            key={o.soc_code}
            href={`/occupation/${o.soc_code}`}
            className="flex items-center justify-between gap-3 py-2.5 text-sm hover:bg-muted/40"
          >
            <span className="flex items-center gap-3">
              <span className="w-4 text-muted-foreground">{i + 1}</span>
              <span className="font-medium">{o.title}</span>
              <ExposureBadge band={o.exposure_band} />
            </span>
            <span className="tabular-nums font-medium">{valueFn(o)}</span>
          </Link>
        ))}
      </CardContent>
    </Card>
  );
}
