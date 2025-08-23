import withMDX from '@next/mdx';
import type { NextConfig } from 'next';

const withMDXConfig = withMDX({
  extension: /\.mdx?$/,
});

const baseConfig: NextConfig = {
  pageExtensions: ['ts', 'tsx', 'js', 'jsx', 'md', 'mdx'],
  experimental: {
    // ppr: true,
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
    ],
  },
  async rewrites() {
    return [
      {
        source: '/app/:path*',
        destination: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/:path*`,
      },
    ]
  },
};

export default withMDXConfig(baseConfig);