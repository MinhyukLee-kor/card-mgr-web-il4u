/** @type {import('next').NextConfig} */
const withPWA = require('next-pwa')({
  dest: 'public',
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === 'development',
  publicExcludes: ['!icons/**/*'],
  buildExcludes: [/chunks\/.*$/],
  fallbacks: {
    document: '/offline',
  },
  cacheOnFrontEndNav: true,
  reloadOnOnline: true,
});

const nextConfig = {
  reactStrictMode: true,
  async rewrites() {
    return [
      {
        source: '/manifest.json',
        destination: '/api/manifest',
      },
    ];
  },
};

module.exports = withPWA(nextConfig); 