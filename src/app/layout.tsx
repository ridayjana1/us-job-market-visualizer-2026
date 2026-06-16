import type { Metadata } from "next";
import { Inter } from "next/font/google";

import "./globals.css";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { ThemeProvider } from "@/components/theme-provider";
import { TooltipProvider } from "@/components/ui/tooltip";

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" });

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "US Job Market Visualizer 2026",
    template: "%s · US Job Market Visualizer 2026",
  },
  description:
    "Interactive exploration of US occupations: employment, wages, growth, education, and AI impact, built on BLS and O*NET data.",
  keywords: [
    "labor market",
    "BLS",
    "O*NET",
    "AI exposure",
    "occupations",
    "wages",
    "employment projections",
  ],
  openGraph: {
    title: "US Job Market Visualizer 2026",
    description:
      "Explore US occupations, wages, growth, education, and AI exposure.",
    url: siteUrl,
    siteName: "US Job Market Visualizer 2026",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.variable} min-h-screen font-sans antialiased`}>
        <ThemeProvider>
          <TooltipProvider delayDuration={150}>
            <div className="flex min-h-screen flex-col">
              <Navbar />
              <main className="flex-1">{children}</main>
              <Footer />
            </div>
          </TooltipProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
