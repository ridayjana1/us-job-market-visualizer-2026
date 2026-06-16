"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import * as d3 from "d3";
import { feature } from "topojson-client";
import type { Feature, Geometry } from "geojson";

import type { StateRecord } from "@/lib/types";

export type MapMetric = "avg_ai_exposure" | "median_wage" | "avg_growth" | "total_employment";

const METRIC_LABEL: Record<MapMetric, string> = {
  avg_ai_exposure: "Avg AI exposure",
  median_wage: "Median wage",
  avg_growth: "Avg growth",
  total_employment: "Total employment",
};

const TOPO_URL = "https://cdn.jsdelivr.net/npm/us-atlas@3/states-10m.json";

/** Choropleth of the 50 states + DC, recolourable by metric and clickable. */
export function USMap({
  states,
  metric,
  selected,
  onSelect,
}: {
  states: StateRecord[];
  metric: MapMetric;
  selected?: string;
  onSelect: (abbr: string) => void;
}) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(720);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [topo, setTopo] = useState<any>(null);
  const [hover, setHover] = useState<{ x: number; y: number; s: StateRecord } | null>(null);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      for (const e of entries) setWidth(e.contentRect.width);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    let cancelled = false;
    d3.json(TOPO_URL).then((data) => {
      if (!cancelled) setTopo(data);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const byFips = useMemo(() => {
    const m = new Map<string, StateRecord>();
    for (const s of states) m.set(s.fips, s);
    return m;
  }, [states]);

  const color = useMemo(() => {
    const values = states.map((s) => s[metric] as number);
    const domain = [d3.min(values) ?? 0, d3.max(values) ?? 1];
    const scheme =
      metric === "avg_ai_exposure"
        ? d3.interpolateOrRd
        : metric === "avg_growth"
          ? d3.interpolateGreens
          : d3.interpolateBlues;
    return d3.scaleSequential(domain, scheme);
  }, [states, metric]);

  const height = width * 0.62;

  const { paths, legendStops } = useMemo(() => {
    if (!topo) return { paths: [], legendStops: [] as { offset: string; color: string }[] };
    const fc = feature(topo, topo.objects.states) as unknown as {
      features: Feature<Geometry, { name: string }>[];
    };
    const projection = d3.geoAlbersUsa().fitSize([width, height], fc as never);
    const path = d3.geoPath(projection);
    const paths = fc.features.map((f) => {
      const fips = String(f.id).padStart(2, "0");
      const rec = byFips.get(fips);
      return {
        fips,
        rec,
        d: path(f) ?? "",
        fill: rec ? color(rec[metric] as number) : "hsl(var(--muted))",
      };
    });
    const stops = d3.range(0, 1.01, 0.1).map((t) => {
      const [a, b] = color.domain();
      return { offset: `${t * 100}%`, color: color(a + t * (b - a)) };
    });
    return { paths, legendStops: stops };
  }, [topo, width, height, byFips, color, metric]);

  return (
    <div ref={wrapRef} className="relative w-full">
      {!topo && (
        <div className="flex h-72 items-center justify-center text-sm text-muted-foreground">
          Loading map…
        </div>
      )}
      {topo && (
        <svg width={width} height={height} role="img" aria-label={`US choropleth by ${METRIC_LABEL[metric]}`}>
          {paths.map((p) => (
            <path
              key={p.fips}
              d={p.d}
              fill={p.fill}
              stroke={selected === p.rec?.abbr ? "hsl(var(--foreground))" : "hsl(var(--background))"}
              strokeWidth={selected === p.rec?.abbr ? 2 : 0.5}
              className="cursor-pointer transition-[stroke-width] hover:stroke-[1.5px]"
              tabIndex={p.rec ? 0 : -1}
              role={p.rec ? "button" : undefined}
              aria-label={p.rec?.name}
              onClick={() => p.rec && onSelect(p.rec.abbr)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && p.rec) onSelect(p.rec.abbr);
              }}
              onMouseMove={(e) => {
                const rect = wrapRef.current?.getBoundingClientRect();
                if (p.rec && rect)
                  setHover({ x: e.clientX - rect.left, y: e.clientY - rect.top, s: p.rec });
              }}
              onMouseLeave={() => setHover(null)}
            />
          ))}
        </svg>
      )}

      {/* legend */}
      {topo && (
        <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
          <span>{METRIC_LABEL[metric]}</span>
          <svg width={160} height={12} aria-hidden>
            <defs>
              <linearGradient id="legend-grad">
                {legendStops.map((s, i) => (
                  <stop key={i} offset={s.offset} stopColor={s.color} />
                ))}
              </linearGradient>
            </defs>
            <rect width={160} height={12} rx={2} fill="url(#legend-grad)" />
          </svg>
        </div>
      )}

      {hover && (
        <div
          className="pointer-events-none absolute z-10 rounded-md border bg-popover px-2.5 py-1.5 text-xs shadow-lg"
          style={{ left: Math.min(hover.x + 12, width - 120), top: hover.y + 12 }}
        >
          <p className="font-semibold">{hover.s.name}</p>
          <p className="text-muted-foreground">
            {METRIC_LABEL[metric]}:{" "}
            {metric === "median_wage"
              ? `$${hover.s.median_wage.toLocaleString()}`
              : metric === "total_employment"
                ? hover.s.total_employment.toLocaleString()
                : metric === "avg_growth"
                  ? `${hover.s.avg_growth}%`
                  : hover.s.avg_ai_exposure.toFixed(2)}
          </p>
        </div>
      )}
    </div>
  );
}
