import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  experimental: {
    // Keep large data files out of the serverless bundle where possible.
    optimizePackageImports: ["lucide-react", "recharts", "d3"],
  },
  async headers() {
    return [
      {
        source: "/api/:path*",
        headers: [
          // API responses are derived from a static dataset - cache aggressively.
          {
            key: "Cache-Control",
            value: "public, s-maxage=86400, stale-while-revalidate=604800",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
