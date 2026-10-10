import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  distDir: process.env.GITHUB_ACTIONS === "true" ? ".next-pages" : ".next",
  output: process.env.GITHUB_ACTIONS === "true" ? "export" : undefined,
  basePath: process.env.GITHUB_ACTIONS === "true" ? "/Noel" : undefined,
  assetPrefix: process.env.GITHUB_ACTIONS === "true" ? "/Noel/" : undefined,
  images: { unoptimized: true },
  cacheComponents: true,
  partialPrefetching: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
