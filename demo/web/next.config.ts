import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Skip TS + ESLint during `next build` — they OOM Node on this Windows box during
  // the Next.js workers' memory-hungry type collection. We run `tsc --noEmit` separately
  // before building.
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
