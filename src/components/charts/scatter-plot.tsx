"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import * as d3 from "d3";

import type { Occupation } from "@/lib/types";
import { formatCompact, formatCurrency, formatPercent, growthColor } from "@/lib/format";

interface TooltipState {
  x: number;
  y: number;
  occ: Occupation;
}

/**
 * AI Exposure × Median Salary scatter.
 *   x: ai_exposure_score   y: median_wage
 *   r: employment (sqrt-scaled)   fill: growth_rate
 * Fully responsive via ResizeObserver; bubbles are keyboard-focusable and
 * navigate to the occupation detail page on click.
 */
export function ScatterPlot({ data }: { data: Occupation[] }) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const router = useRouter();
  const [width, setWidth] = useState(880);
  const [tooltip, setTooltip] = useState<TooltipState | null>(null);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      for (const e of entries) setWidth(e.contentRect.width);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const height = Math.max(420, Math.min(640, width * 0.62));
  const margin = useMemo(() => ({ top: 20, right: 24, bottom: 52, left: 72 }), []);

  const scales = useMemo(() => {
    const innerW = width - margin.left - margin.right;
    const innerH = height - margin.top - margin.bottom;
    const x = d3.scaleLinear().domain([0, 1]).range([0, innerW]).nice();
    const maxWage = d3.max(data, (d) => d.median_wage) ?? 250000;
    const y = d3.scaleLinear().domain([0, maxWage * 1.05]).range([innerH, 0]).nice();
    const maxEmp = d3.max(data, (d) => d.employment) ?? 1;
    const r = d3.scaleSqrt().domain([0, maxEmp]).range([3, 34]);
    return { x, y, r, innerW, innerH };
  }, [data, width, height, margin]);

  useEffect(() => {
    if (!svgRef.current) return;
    const svg = d3.select(svgRef.current);
    const { x, y, innerH } = scales;

    svg.select<SVGGElement>(".x-axis")
      .attr("transform", `translate(0,${innerH})`)
      .call(d3.axisBottom(x).ticks(6).tickFormat((d) => `${(Number(d) * 100).toFixed(0)}%`) as never)
      .call((g) => g.select(".domain").attr("stroke", "currentColor").attr("stroke-opacity", 0.2));

    svg.select<SVGGElement>(".y-axis")
      .call(d3.axisLeft(y).ticks(6).tickFormat((d) => `$${(Number(d) / 1000).toFixed(0)}k`) as never)
      .call((g) => g.select(".domain").attr("stroke", "currentColor").attr("stroke-opacity", 0.2));

    svg.selectAll(".tick line").attr("stroke", "currentColor").attr("stroke-opacity", 0.1);
    svg.selectAll(".tick text").attr("fill", "currentColor").attr("opacity", 0.6);
  }, [scales]);

  return (
    <div ref={wrapRef} className="relative w-full">
      <svg
        ref={svgRef}
        width={width}
        height={height}
        role="img"
        aria-label="Scatter plot of AI exposure versus median salary by occupation"
        className="overflow-visible text-foreground"
      >
        <g transform={`translate(${margin.left},${margin.top})`}>
          {/* gridlines */}
          {scales.y.ticks(6).map((t) => (
            <line
              key={t}
              x1={0}
              x2={scales.innerW}
              y1={scales.y(t)}
              y2={scales.y(t)}
              stroke="currentColor"
              strokeOpacity={0.06}
            />
          ))}
          <g className="x-axis" />
          <g className="y-axis" />

          {/* bubbles, larger first so small ones stay clickable on top */}
          {[...data]
            .sort((a, b) => b.employment - a.employment)
            .map((d) => (
              <circle
                key={d.soc_code}
                cx={scales.x(d.ai_exposure_score)}
                cy={scales.y(d.median_wage)}
                r={scales.r(d.employment)}
                fill={growthColor(d.growth_rate)}
                fillOpacity={0.62}
                stroke={growthColor(d.growth_rate)}
                strokeOpacity={0.9}
                tabIndex={0}
                role="button"
                aria-label={`${d.title}. Exposure ${(d.ai_exposure_score * 100).toFixed(0)} percent, median ${formatCurrency(d.median_wage)}`}
                className="cursor-pointer outline-none transition-[stroke-width] focus:stroke-[3px] hover:stroke-[3px]"
                onMouseEnter={() =>
                  setTooltip({
                    x: scales.x(d.ai_exposure_score),
                    y: scales.y(d.median_wage),
                    occ: d,
                  })
                }
                onMouseLeave={() => setTooltip(null)}
                onFocus={() =>
                  setTooltip({
                    x: scales.x(d.ai_exposure_score),
                    y: scales.y(d.median_wage),
                    occ: d,
                  })
                }
                onBlur={() => setTooltip(null)}
                onClick={() => router.push(`/occupation/${d.soc_code}`)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") router.push(`/occupation/${d.soc_code}`);
                }}
              />
            ))}
        </g>

        {/* axis labels */}
        <text
          x={margin.left + scales.innerW / 2}
          y={height - 8}
          textAnchor="middle"
          className="fill-current text-xs font-medium opacity-70"
        >
          AI Impact (how much AI may change the work)
        </text>
        <text
          transform={`translate(16,${margin.top + scales.innerH / 2}) rotate(-90)`}
          textAnchor="middle"
          className="fill-current text-xs font-medium opacity-70"
        >
          Median Annual Wage
        </text>
      </svg>

      {tooltip && (
        <div
          className="pointer-events-none absolute z-10 w-56 rounded-lg border bg-popover p-3 text-xs shadow-lg"
          style={{
            left: Math.min(tooltip.x + margin.left + 12, width - 230),
            top: tooltip.y + margin.top - 8,
          }}
        >
          <p className="font-semibold">{tooltip.occ.title}</p>
          <p className="text-muted-foreground">{tooltip.occ.soc_code}</p>
          <dl className="mt-2 grid grid-cols-2 gap-x-2 gap-y-0.5">
            <dt className="text-muted-foreground">AI Impact</dt>
            <dd className="text-right font-medium">{tooltip.occ.ai_exposure_score.toFixed(2)}</dd>
            <dt className="text-muted-foreground">Median</dt>
            <dd className="text-right font-medium">{formatCurrency(tooltip.occ.median_wage)}</dd>
            <dt className="text-muted-foreground">Employment</dt>
            <dd className="text-right font-medium">{formatCompact(tooltip.occ.employment)}</dd>
            <dt className="text-muted-foreground">Growth</dt>
            <dd className="text-right font-medium">{formatPercent(tooltip.occ.growth_rate)}</dd>
          </dl>
        </div>
      )}
    </div>
  );
}
