import type { NextConfig } from "next";

const isGithubPages = process.env.GITHUB_PAGES_BUILD === "true" || process.env.GITHUB_ACTIONS === "true";

const nextConfig: NextConfig = {
  distDir: process.env.NEXT_DIST_DIR || (isGithubPages ? ".next-pages" : ".next"),
  output: isGithubPages ? "export" : undefined,
  basePath: isGithubPages ? "/Noel" : undefined,
  assetPrefix: isGithubPages ? "/Noel/" : undefined,
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
