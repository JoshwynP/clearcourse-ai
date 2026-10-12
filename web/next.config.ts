import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Node.js runtime only. Cache Components stay off until a later privacy review.
  allowedDevOrigins: ["127.0.0.1"],
};

export default nextConfig;
