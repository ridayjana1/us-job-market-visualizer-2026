"use client";

import * as React from "react";
import Link from "next/link";
import {
  ArrowRight,
  Github,
  BarChart3,
  Brain,
  Compass,
  DollarSign,
  MapPin,
  Sparkles,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/* ──────────────────────────────────────────────────────────────────────────
   PixelCanvas
   A subtle, theme-aware animated pixel shimmer rendered to <canvas>. It reads
   the active theme's `--primary` HSL channel from the element's computed style
   so it adapts to dark/light automatically — no hardcoded colors.

   Performance & correctness:
   - Client-only paint (everything happens inside effects → no hydration drift).
   - Single requestAnimationFrame loop, cancelled on unmount.
   - ResizeObserver sizes the canvas to its container (DPR-aware) and disconnects
     on unmount.
   - Respects prefers-reduced-motion: paints one static frame, no RAF loop.
   ────────────────────────────────────────────────────────────────────────── */
function PixelCanvas({ className }: { className?: string }) {
  const canvasRef = React.useRef<HTMLCanvasElement | null>(null);

  React.useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const parent = canvas.parentElement;
    if (!parent) return;

    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    // Read the theme's primary color (HSL channels) from computed styles so the
    // shimmer tracks dark/light without hardcoding. Fallback to a neutral slate.
    const readColor = () => {
      const raw = getComputedStyle(parent)
        .getPropertyValue("--primary")
        .trim();
      return raw || "222 47% 60%";
    };
    let colorChannels = readColor();

    const CELL = 14; // px between pixel centers (CSS px)
    let cols = 0;
    let rows = 0;
    let phases: Float32Array = new Float32Array(0);
    let cssW = 0;
    let cssH = 0;

    const buildGrid = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const rect = parent.getBoundingClientRect();
      cssW = Math.max(1, Math.floor(rect.width));
      cssH = Math.max(1, Math.floor(rect.height));

      canvas.width = Math.floor(cssW * dpr);
      canvas.height = Math.floor(cssH * dpr);
      canvas.style.width = `${cssW}px`;
      canvas.style.height = `${cssH}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      cols = Math.ceil(cssW / CELL) + 1;
      rows = Math.ceil(cssH / CELL) + 1;

      // Stable per-pixel phase offset so the shimmer looks organic, not uniform.
      phases = new Float32Array(cols * rows);
      for (let i = 0; i < phases.length; i++) {
        phases[i] = Math.random() * Math.PI * 2;
      }
    };

    const draw = (t: number) => {
      ctx.clearRect(0, 0, cssW, cssH);
      const time = t * 0.0006;
      const pixel = 3; // size of each lit square (CSS px)

      for (let y = 0; y < rows; y++) {
        for (let x = 0; x < cols; x++) {
          const phase = phases[y * cols + x];
          // Diagonal travelling wave + per-pixel phase → soft shimmer.
          const wave = Math.sin((x + y) * 0.45 - time * 3 + phase);
          // Keep it subtle: only the brighter crest of the wave is visible.
          const lit = (wave + 1) / 2; // 0..1
          if (lit < 0.55) continue;
          const alpha = (lit - 0.55) * 0.42; // max ~0.19
          ctx.fillStyle = `hsl(${colorChannels} / ${alpha})`;
          ctx.fillRect(x * CELL, y * CELL, pixel, pixel);
        }
      }
    };

    let raf = 0;
    const loop = (t: number) => {
      draw(t);
      raf = requestAnimationFrame(loop);
    };

    buildGrid();

    if (reduceMotion) {
      // One calm static frame — information is never animation-only.
      draw(0);
    } else {
      raf = requestAnimationFrame(loop);
    }

    const ro = new ResizeObserver(() => {
      buildGrid();
      if (reduceMotion) draw(0);
    });
    ro.observe(parent);

    // Re-read color if the theme toggles (class change on <html>).
    const themeObserver = new MutationObserver(() => {
      colorChannels = readColor();
    });
    themeObserver.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });

    return () => {
      if (raf) cancelAnimationFrame(raf);
      ro.disconnect();
      themeObserver.disconnect();
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className={cn("pointer-events-none absolute inset-0 h-full w-full", className)}
    />
  );
}

/* Product-relevant capability badges (replaces any "trusted by" logo marquee). */
const BADGES = [
  { label: "BLS Data", icon: BarChart3 },
  { label: "O*NET", icon: Compass },
  { label: "AI Impact", icon: Brain },
  { label: "State Insights", icon: MapPin },
  { label: "Salary Data", icon: DollarSign },
  { label: "Career Explorer", icon: Sparkles },
] as const;

export interface PixelPerfectHeroProps {
  word1?: string;
  word2?: string;
  description?: string;
  primaryHref?: string;
  primaryLabel?: string;
  secondaryHref?: string;
  secondaryLabel?: string;
  eyebrow?: string;
  className?: string;
}

export function PixelPerfectHero({
  word1 = "Job Market",
  word2 = "Explorer",
  description = "Explore U.S. occupations through wages, growth, education, AI impact, and state-level insights.",
  primaryHref = "/explorer",
  primaryLabel = "Start exploring",
  secondaryHref = "https://github.com/ridayjana1/us-job-market-visualizer-2026",
  secondaryLabel = "View GitHub",
  eyebrow,
  className,
}: PixelPerfectHeroProps) {
  return (
    <section
      className={cn("relative overflow-hidden border-b", className)}
    >
      {/* Layered backdrop: existing grid + animated pixel shimmer, both faded
          toward the edges so the section stays readable and on-brand. */}
      <div className="absolute inset-0 bg-grid" aria-hidden />
      <div
        className="absolute inset-0 [mask-image:radial-gradient(ellipse_75%_60%_at_50%_0%,black_35%,transparent_100%)]"
        aria-hidden
      >
        <PixelCanvas />
      </div>
      <div
        className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-background"
        aria-hidden
      />

      <div className="container relative py-20 md:py-28">
        <div className="mx-auto max-w-3xl text-center">
          {eyebrow ? (
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border bg-background/60 px-3 py-1 text-xs font-medium text-muted-foreground backdrop-blur">
              <Sparkles className="h-3.5 w-3.5 text-primary" />
              {eyebrow}
            </div>
          ) : null}

          <h1 className="text-5xl font-bold tracking-tight md:text-7xl">
            <span className="block text-foreground">{word1}</span>
            <span className="block bg-gradient-to-br from-primary via-primary to-muted-foreground bg-clip-text text-transparent">
              {word2}
            </span>
          </h1>

          <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground md:text-xl">
            {description}
          </p>

          <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
            <Button asChild size="lg">
              <Link href={primaryHref}>
                {primaryLabel}
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <a
                href={secondaryHref}
                target="_blank"
                rel="noreferrer noopener"
              >
                <Github className="h-4 w-4" />
                {secondaryLabel}
              </a>
            </Button>
          </div>

          {/* Capability badges — product-relevant, not vendor logos. */}
          <ul className="mt-10 flex flex-wrap items-center justify-center gap-2">
            {BADGES.map(({ label, icon: Icon }) => (
              <li key={label}>
                <span className="inline-flex items-center gap-1.5 rounded-full border bg-background/50 px-3 py-1 text-xs font-medium text-muted-foreground backdrop-blur transition-colors hover:text-foreground">
                  <Icon className="h-3.5 w-3.5 text-primary" aria-hidden />
                  {label}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}

export default PixelPerfectHero;
