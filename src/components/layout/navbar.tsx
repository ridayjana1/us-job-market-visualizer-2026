"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BarChart3, Menu } from "lucide-react";
import { useState } from "react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";

const NAV = [
  { href: "/explorer", label: "Explorer" },
  { href: "/scatter", label: "Scatter" },
  { href: "/ai-exposure", label: "AI Impact" },
  { href: "/states", label: "States" },
  { href: "/trends", label: "Trends" },
  { href: "/data-sources", label: "Data Sources" },
  { href: "/about", label: "About" },
];

export function Navbar() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 w-full border-b bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-14 items-center justify-between">
        <Link href="/" className="flex items-center gap-2 font-semibold">
          <BarChart3 className="h-5 w-5 text-primary" />
          <span className="hidden sm:inline">US Job Market Visualizer</span>
          <span className="sm:hidden">JobViz</span>
          <span className="rounded bg-primary/10 px-1.5 py-0.5 text-[10px] font-bold text-primary">
            2026
          </span>
        </Link>

        <nav className="hidden items-center gap-1 md:flex">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "rounded-md px-3 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground",
                pathname.startsWith(item.href) && "bg-accent text-foreground",
              )}
            >
              {item.label}
            </Link>
          ))}
          <div className="ml-1 border-l pl-1">
            <ThemeToggle />
          </div>
        </nav>

        <div className="flex items-center gap-1 md:hidden">
          <ThemeToggle />
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setOpen((v) => !v)}
            aria-label="Toggle navigation"
          >
            <Menu className="h-5 w-5" />
          </Button>
        </div>
      </div>

      {open && (
        <nav className="container flex flex-col gap-1 pb-3 md:hidden">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setOpen(false)}
              className={cn(
                "rounded-md px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-accent hover:text-foreground",
                pathname.startsWith(item.href) && "bg-accent text-foreground",
              )}
            >
              {item.label}
            </Link>
          ))}
        </nav>
      )}
    </header>
  );
}
