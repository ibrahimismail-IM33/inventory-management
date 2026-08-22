import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Keep the untouched reference workspace out of the build.
  outputFileTracingExcludes: {
    "*": ["./reference/**"],
  },
};

export default nextConfig;
