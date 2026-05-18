const path = require('path');

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
  webpack(config) {
    config.resolve.alias['@shaj/database'] = path.resolve(__dirname, '../../packages/database/src/index.ts');
    config.resolve.alias['@shaj/types'] = path.resolve(__dirname, '../../packages/types/src/index.ts');
    config.resolve.alias['@shaj/utils'] = path.resolve(__dirname, '../../packages/utils/src/index.ts');
    return config;
  },
};

module.exports = nextConfig;
