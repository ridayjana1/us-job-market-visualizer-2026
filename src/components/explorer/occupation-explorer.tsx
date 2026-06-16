"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ArrowUpDown, Search, X } from "lucide-react";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ImpactBadge } from "@/components/metrics/impact-badge";
import { DemandBadge } from "@/components/metrics/demand-badge";
import { OutlookDot } from "@/components/metrics/outlook-dot";
import { ColorLegend } from "@/components/color-legend";
import { formatCompact, formatCurrency, formatPercent } from "@/lib/format";
import type { Occupation } from "@/lib/types";

type SortKey = "title" | "employment" | "median_wage" | "growth_rate" | "ai_exposure_score";

const ALL = "__all__";

export function OccupationExplorer({
  occupations,
  majorGroups,
  educationLevels,
}: {
  occupations: Occupation[];
  majorGroups: { code: string; title: string }[];
  educationLevels: string[];
}) {
  const [q, setQ] = useState("");
  const [majorGroup, setMajorGroup] = useState<string>(ALL);
  const [education, setEducation] = useState<string>(ALL);
  const [exposure, setExposure] = useState<string>(ALL);
  const [minWage, setMinWage] = useState(0);
  const [minEmployment, setMinEmployment] = useState(0);
  const [minGrowth, setMinGrowth] = useState(-15);
  const [sort, setSort] = useState<SortKey>("employment");
  const [order, setOrder] = useState<"asc" | "desc">("desc");

  const maxWage = useMemo(
    () => Math.max(...occupations.map((o) => o.median_wage)),
    [occupations],
  );

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const rows = occupations.filter((o) => {
      if (needle) {
        const hay = `${o.title} ${o.soc_code} ${o.major_group_title}`.toLowerCase();
        if (!hay.includes(needle)) return false;
      }
      if (majorGroup !== ALL && o.major_group !== majorGroup) return false;
      if (education !== ALL && o.education !== education) return false;
      if (exposure !== ALL && o.exposure_band !== exposure) return false;
      if (o.median_wage < minWage) return false;
      if (o.employment < minEmployment) return false;
      if (o.growth_rate < minGrowth) return false;
      return true;
    });
    rows.sort((a, b) => {
      const av = a[sort];
      const bv = b[sort];
      const cmp =
        typeof av === "number" && typeof bv === "number"
          ? av - bv
          : String(av).localeCompare(String(bv));
      return order === "asc" ? cmp : -cmp;
    });
    return rows;
  }, [occupations, q, majorGroup, education, exposure, minWage, minEmployment, minGrowth, sort, order]);

  const reset = () => {
    setQ("");
    setMajorGroup(ALL);
    setEducation(ALL);
    setExposure(ALL);
    setMinWage(0);
    setMinEmployment(0);
    setMinGrowth(-15);
  };

  const toggleSort = (key: SortKey) => {
    if (sort === key) setOrder((o) => (o === "asc" ? "desc" : "asc"));
    else {
      setSort(key);
      setOrder("desc");
    }
  };

  const SortHead = ({ k, children, className }: { k: SortKey; children: React.ReactNode; className?: string }) => (
    <TableHead className={className}>
      <button
        onClick={() => toggleSort(k)}
        className="inline-flex items-center gap-1 hover:text-foreground"
      >
        {children}
        <ArrowUpDown className={`h-3 w-3 ${sort === k ? "opacity-100" : "opacity-30"}`} />
      </button>
    </TableHead>
  );

  return (
    <div className="grid gap-6 lg:grid-cols-[300px_1fr]">
      {/* Filters */}
      <Card className="h-fit lg:sticky lg:top-20">
        <CardContent className="space-y-5 p-5">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold">Filters</h2>
            <Button variant="ghost" size="sm" onClick={reset} className="h-7 text-xs">
              <X className="mr-1 h-3 w-3" /> Reset
            </Button>
          </div>

          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Title, SOC, or industry…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              className="pl-8"
            />
          </div>

          <Field label="Industry (major group)">
            <Select value={majorGroup} onValueChange={setMajorGroup}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>All industries</SelectItem>
                {majorGroups.map((g) => (
                  <SelectItem key={g.code} value={g.code}>{g.title}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>

          <Field label="Education">
            <Select value={education} onValueChange={setEducation}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>Any education</SelectItem>
                {educationLevels.map((e) => (
                  <SelectItem key={e} value={e}>{e}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>

          <Field label="AI Impact">
            <Select value={exposure} onValueChange={setExposure}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>Any AI impact</SelectItem>
                <SelectItem value="low">Low</SelectItem>
                <SelectItem value="moderate">Medium</SelectItem>
                <SelectItem value="high">High</SelectItem>
              </SelectContent>
            </Select>
          </Field>

          <Field label={`Min. median wage: ${formatCurrency(minWage)}`}>
            <Slider value={[minWage]} min={0} max={maxWage} step={5000} onValueChange={([v]) => setMinWage(v)} />
          </Field>

          <Field label={`Min. employment: ${formatCompact(minEmployment)}`}>
            <Slider value={[minEmployment]} min={0} max={2000000} step={50000} onValueChange={([v]) => setMinEmployment(v)} />
          </Field>

          <Field label={`Min. growth: ${formatPercent(minGrowth)}`}>
            <Slider value={[minGrowth]} min={-15} max={35} step={1} onValueChange={([v]) => setMinGrowth(v)} />
          </Field>
        </CardContent>
      </Card>

      {/* Results */}
      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-muted-foreground">
            {filtered.length} occupation{filtered.length === 1 ? "" : "s"}
          </p>
          <ColorLegend />
        </div>
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <SortHead k="title">Occupation</SortHead>
                <SortHead k="employment" className="text-right">Jobs</SortHead>
                <SortHead k="median_wage" className="text-right">Median pay</SortHead>
                <SortHead k="growth_rate" className="text-right">Job growth</SortHead>
                <TableHead>Demand</TableHead>
                <SortHead k="ai_exposure_score">AI Impact</SortHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((o) => (
                <TableRow key={o.soc_code}>
                  <TableCell>
                    <span className="flex items-center gap-2">
                      <OutlookDot growthRate={o.growth_rate} />
                      <Link href={`/occupation/${o.soc_code}`} className="font-medium hover:underline">
                        {o.title}
                      </Link>
                    </span>
                    <div className="pl-[18px] text-xs text-muted-foreground">
                      {o.soc_code} · {o.major_group_title}
                    </div>
                  </TableCell>
                  <TableCell className="text-right tabular-nums">{formatCompact(o.employment)}</TableCell>
                  <TableCell className="text-right tabular-nums">{formatCurrency(o.median_wage)}</TableCell>
                  <TableCell className="text-right tabular-nums">{formatPercent(o.growth_rate)}</TableCell>
                  <TableCell><DemandBadge occ={o} showLabel={false} /></TableCell>
                  <TableCell><ImpactBadge occ={o} showLabel={false} /></TableCell>
                </TableRow>
              ))}
              {filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="py-10 text-center text-muted-foreground">
                    No occupations match these filters.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </Card>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <label className="text-xs font-medium text-muted-foreground">{label}</label>
      {children}
    </div>
  );
}
