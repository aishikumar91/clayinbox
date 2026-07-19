import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Standalone is useful for Docker; Vercel ignores it.
  output: process.env.VERCEL ? undefined : "standalone",
};

export default nextConfig;
