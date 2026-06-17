"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import * as d3 from "d3";

import type { Occupation } from "@/lib/types";
import { cn } from "@/lib/utils";
import { formatCompact, formatCurrency, formatPercent, growthColor } from "@/lib/format";

type ViewMode = "scatter" | "bubble";

/** A laid-out point: keeps the true data anchor (x0/y0) and the rendered
 *  position (x/y), which may be nudged by the force layout in scatter view. */
interface PlotNode extends Occupation {
  x0: number;
  y0: number;
  x: number;
  y: number;
  r: number;
}

interface TooltipState {
  x: number;
  y: number;
  occ: Occupation;
}

/**
 * AI Impact × Median Salary scatter.
 *   x: ai_exposure_score   y: median_wage   color: growth_rate (job outlook)
 *   size: employment
 *
 * Two views:
 *   • Scatter (default) — small solid dots spaced apart with a d3-force
 *     collision layout so overlapping occupations become individually
 *     readable while staying near their true position.
 *   • Bubble — classic sqrt-scaled translucent bubbles at exact positions.
 *
 * Fully responsive via ResizeObserver; points are keyboard-focusable and
 * navigate to the occupation detail page on click.
 */
export function ScatterPlot({ data }: { data: Occupation[] }) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const router = useRouter();
  const [width, setWidth] = useState(880);
  const [view, setView] = useState<ViewMode>("scatter");
  const [hovered, setHovered] = useState<string | null>(null);
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
    // Compact dots for scatter view, larger bubbles for bubble view.
    const rDot = d3.scaleSqrt().domain([0, maxEmp]).range([3.5, 9]);
    const rBubble = d3.scaleSqrt().domain([0, maxEmp]).range([4, 32]);
    return { x, y, rDot, rBubble, innerW, innerH };
  }, [data, width, height, margin]);

  // Lay out the points. In scatter view we run a short, deterministic force
  // simulation that pulls each point toward its true (x0,y0) while a collision
  // force pushes overlapping points apart — preserving values, removing clutter.
  const nodes = useMemo<PlotNode[]>(() => {
    const { x, y, rDot, rBubble, innerW, innerH } = scales;
    const base: PlotNode[] = data.map((d) => {
      const x0 = x(d.ai_exposure_score);
      const y0 = y(d.median_wage);
      const r = view === "bubble" ? rBubble(d.employment) : rDot(d.employment);
      return { ...d, x0, y0, x: x0, y: y0, r };
    });

    if (view === "bubble") return base;

    const sim = d3
      .forceSimulation(base as unknown as d3.SimulationNodeDatum[])
      .force("x", d3.forceX<PlotNode>((d) => d.x0).strength(0.65))
      .force("y", d3.forceY<PlotNode>((d) => d.y0).strength(0.65))
      .force("collide", d3.forceCollide<PlotNode>((d) => d.r + 1.6).strength(1).iterations(3))
      .stop();
    for (let i = 0; i < 280; i++) sim.tick();

    // Keep everything inside the plotting area.
    for (const n of base) {
      n.x = Math.max(n.r, Math.min(innerW - n.r, n.x));
      n.y = Math.max(n.r, Math.min(innerH - n.r, n.y));
    }
    return base;
  }, [data, scales, view]);

  // Largest first so smaller points render on top and stay hittable.
  const ordered = useMemo(() => [...nodes].sort((a, b) => b.r - a.r), [nodes]);
  const hoveredNode = hovered ? nodes.find((n) => n.soc_code === hovered) : null;

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

  const show = (n: PlotNode) => {
    setHovered(n.soc_code);
    setTooltip({ x: n.x, y: n.y, occ: n });
  };
  const hide = () => {
    setHovered(null);
    setTooltip(null);
  };

  const renderPoint = (n: PlotNode, opts: { top?: boolean } = {}) => {
    const color = growthColor(n.growth_rate);
    const isActive = hovered === n.soc_code;
    const dimmed = hovered !== null && !isActive;
    const fillOpacity = view === "bubble" ? (isActive ? 0.85 : dimmed ? 0.18 : 0.55) : isActive ? 1 : dimmed ? 0.28 : 0.9;
    return (
      <circle
        key={opts.top ? `${n.soc_code}-top` : n.soc_code}
        cx={n.x}
        cy={n.y}
        r={isActive ? n.r + (view === "bubble" ? 1 : 1.5) : n.r}
        fill={color}
        fillOpacity={fillOpacity}
        stroke={isActive ? "var(--background, #0a0a0a)" : color}
        strokeWidth={isActive ? 2 : view === "bubble" ? 0.75 : 1}
        strokeOpacity={isActive ? 1 : view === "bubble" ? 0.7 : 0.55}
        tabIndex={0}
        role="button"
        aria-label={`${n.title}. AI impact ${(n.ai_exposure_score * 100).toFixed(0)} percent, median ${formatCurrency(n.median_wage)}`}
        className="cursor-pointer outline-none transition-[r,fill-opacity,stroke-width] duration-150 focus-visible:stroke-[2px]"
        onMouseEnter={() => show(n)}
        onMouseLeave={hide}
        onFocus={() => show(n)}
        onBlur={hide}
        onClick={() => router.push(`/occupation/${n.soc_code}`)}
        onKeyDown={(e) => {
          if (e.key === "Enter") router.push(`/occupation/${n.soc_code}`);
        }}
      />
    );
  };

  // Edge-aware tooltip placement so it never spills off-canvas or covers the point.
  const tipW = 224;
  const tipLeftRaw = tooltip ? tooltip.x + margin.left + 14 : 0;
  const flipX = tooltip ? tipLeftRaw + tipW > width : false;
  const tipLeft = tooltip ? (flipX ? tooltip.x + margin.left - tipW - 14 : tipLeftRaw) : 0;
  const tipTop = tooltip ? Math.max(8, tooltip.y + margin.top - 90) : 0;

  return (
    <div ref={wrapRef} className="relative w-full">
      {/* View toggle */}
      <div className="mb-3 flex items-center justify-end">
        <div
          role="radiogroup"
          aria-label="Chart view"
          className="inline-flex rounded-lg border bg-muted/40 p-0.5 text-xs font-medium"
        >
          {(["scatter", "bubble"] as const).map((mode) => (
            <button
              key={mode}
              type="button"
              role="radio"
              aria-checked={view === mode}
              onClick={() => setView(mode)}
              className={cn(
                "rounded-md px-3 py-1.5 capitalize transition-colors",
                view === mode
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {mode === "scatter" ? "Scatter view" : "Bubble view"}
            </button>
          ))}
        </div>
      </div>

      <svg
        ref={svgRef}
        width={width}
        height={height}
        role="img"
        aria-label="Scatter plot of AI impact versus median salary by occupation"
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

          {ordered.map((n) => renderPoint(n))}
          {/* Active point re-rendered last so it sits above its neighbors. */}
          {hoveredNode && renderPoint(hoveredNode, { top: true })}
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
          className="pointer-events-none absolute z-10 rounded-lg border bg-popover p-3 text-xs shadow-lg"
          style={{ left: tipLeft, top: tipTop, width: tipW }}
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
