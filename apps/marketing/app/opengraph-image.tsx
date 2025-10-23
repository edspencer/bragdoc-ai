import { createOGImage, ogImageSize } from '@/lib/og-image';

export const runtime = 'edge';
export const alt = 'BragDoc - AI-Powered Achievement Tracking for Developers';
export const size = ogImageSize;
export const contentType = 'image/png';

export default async function Image() {
  return createOGImage({
    title: 'BragDoc',
    subtitle: 'AI-Powered Achievement Tracking for Developers',
    badges: ['Git-Powered', 'Privacy-First', 'Open Source'],
  });
}
