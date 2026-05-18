/** @type {import('next').NextConfig} */
const nextConfig = {
  basePath: '/admin',
  skipTrailingSlashRedirect: true,
  transpilePackages: ['@shaj/types', '@shaj/utils', '@shaj/database'],
  experimental: {
    optimizePackageImports: ['lucide-react', 'recharts'],
  },
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '*.amazonaws.com' },
      { protocol: 'https', hostname: '*.cloudflare.com' },
      { protocol: 'https', hostname: 'res.cloudinary.com' },
      { protocol: 'http', hostname: 'localhost' },
    ],
  },
};

module.exports = nextConfig;
