import type { NextConfig } from "next";

// GitHub Actions is also set by other Git-based deployment providers. Use a
// dedicated flag so the Vercel build keeps its server routes and root assets.
const isGithubPages = process.env.GITHUB_PAGES_BUILD === "true";

const nextConfig: NextConfig = {
  distDir: process.env.NEXT_DIST_DIR || (isGithubPages ? ".next-pages" : ".next"),
  output: isGithubPages ? "export" : undefined,
  basePath: isGithubPages ? "/Noel" : undefined,
  assetPrefix: isGithubPages ? "/Noel/" : undefined,
  images: { unoptimized: true },
  cacheComponents: !isGithubPages,
  partialPrefetching: !isGithubPages,
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
