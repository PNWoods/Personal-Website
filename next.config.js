/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    // Document parsers pull in Node-only modules that webpack bundles badly;
    // Vercel's file tracer still ships them with the route handlers.
    serverComponentsExternalPackages: ['mammoth', 'unpdf'],
  },
}

module.exports = nextConfig
