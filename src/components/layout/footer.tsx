import Link from "next/link";

import { Attribution, INDEPENDENCE_DISCLAIMER } from "@/components/attribution";

/**
 * Global footer. Rendered once in the root layout so the O*NET attribution,
 * trademark notice, badge, and independence disclaimer appear on every page
 * and survive client-side navigation between routes.
 */
export function Footer() {
  return (
    <footer className="mt-16 border-t bg-muted/30">
      <div className="container py-10">
        <div className="grid gap-8 md:grid-cols-3">
          <div className="space-y-2">
            <h3 className="text-sm font-semibold">US Job Market Visualizer 2026</h3>
            <p className="text-sm text-muted-foreground">
              Explore US occupations, wages, growth, education, and AI exposure
              with data from BLS and O*NET.
            </p>
          </div>

          <div className="space-y-2">
            <h3 className="text-sm font-semibold">Explore</h3>
            <ul className="space-y-1 text-sm text-muted-foreground">
              <li><Link href="/explorer" className="hover:text-foreground">Occupation Explorer</Link></li>
              <li><Link href="/scatter" className="hover:text-foreground">Exposure × Wage Scatter</Link></li>
              <li><Link href="/states" className="hover:text-foreground">State Explorer</Link></li>
              <li><Link href="/trends" className="hover:text-foreground">Trend Dashboard</Link></li>
            </ul>
          </div>

          <div className="space-y-2">
            <h3 className="text-sm font-semibold">About the data</h3>
            <ul className="space-y-1 text-sm text-muted-foreground">
              <li><Link href="/data-sources" className="hover:text-foreground">Data Sources &amp; Methodology</Link></li>
              <li><Link href="/about" className="hover:text-foreground">About this project</Link></li>
              <li>
                <a href="https://www.bls.gov/oes/" target="_blank" rel="noopener noreferrer" className="hover:text-foreground">
                  Bureau of Labor Statistics
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* O*NET attribution - required on every page. */}
        <div className="mt-8 border-t pt-6">
          <Attribution variant="footer" />
          <p className="mt-3 text-xs text-muted-foreground">
            {INDEPENDENCE_DISCLAIMER}
          </p>
          <p className="mt-3 text-xs text-muted-foreground">
            AI exposure measures task overlap with current AI capabilities - it
            is <span className="font-medium">not</span> a prediction of job loss.
            Exposure is decomposed into augmentation and automation potential
            following the Anthropic Economic Index framing.
          </p>
        </div>
      </div>
    </footer>
  );
}
