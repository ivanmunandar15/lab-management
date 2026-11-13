import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Hanya untuk image Docker (Dockerfile mengisi BUILD_STANDALONE=true); `npm run dev/start` lokal tidak terpengaruh.
  output: process.env.BUILD_STANDALONE === "true" ? "standalone" : undefined,
};

export default nextConfig;
