/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  experimental: {
    serverActions: {
      bodySizeLimit: '5mb', // Increase to 5 MB to handle larger PDFs
    },
  },
  // Prevent Next.js from bundling pdfjs-dist (it has native/worker dependencies)
  serverExternalPackages: ['pdfjs-dist'],
};

module.exports = nextConfig;