import withMDX from '@next/mdx';
import type { NextConfig } from 'next';

const withMDXConfig = withMDX({
  extension: /\.mdx?$/,
});

const baseConfig: NextConfig = {
  pageExtensions: ['ts', 'tsx', 'js', 'jsx', 'md', 'mdx'],
  experimental: {
    // ppr: true,
    serverComponentsExternalPackages: ['puppeteer-core', '@sparticuz/chromium'],
  },
  images: {
    remotePatterns: [
      {
        hostname: 'avatar.vercel.sh',
      },
      {
        protocol: 'https',
        hostname: 'avatars.githubusercontent.com',
      },
      {
        protocol: 'https',
        hostname: 'lh3.googleusercontent.com',
      },
    ],
  },
  async rewrites() {
    return [
      {
        source: '/api/auth/:path*',
        destination: '/api/auth/:path*',
      },
    ]
  },
};

export default withMDXConfig(baseConfig);