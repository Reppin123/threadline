/** @type {import('next').NextConfig} */
const nextConfig = {
  // start:all can build into a separate dir without clobbering a running `next dev`.
  distDir: process.env.NEXT_DIST_DIR || ".next",
  transpilePackages: ["@threadline/core", "@threadline/db"],
  // Heavy/optional deps that core lazy-imports at runtime; never bundle them.
  serverExternalPackages: ["@anthropic-ai/sdk", "@modelcontextprotocol/sdk", "puppeteer-core", "puppeteer", "cheerio"],
  poweredByHeader: false,
  devIndicators: false,
  eslint: { ignoreDuringBuilds: true },
};
export default nextConfig;
