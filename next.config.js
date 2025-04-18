/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  compiler: {
    // See https://nextjs.org/docs/advanced-features/compiler
    styledComponents: false,
  },
  // Ensure experimental features for next/font are enabled
  experimental: {
    forceSwcTransforms: true, // Force SWC transforms even with a custom Babel config
  },
};

module.exports = nextConfig; 