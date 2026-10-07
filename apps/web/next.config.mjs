/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ["@threadline/core", "@threadline/db"],
  poweredByHeader: false,
  devIndicators: false,
  typescript: { ignoreBuildErrors: false },
  eslint: { ignoreDuringBuilds: true },
};
export default nextConfig;
