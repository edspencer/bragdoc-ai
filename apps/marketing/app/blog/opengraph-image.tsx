import { createOGImage, ogImageSize } from '@/lib/og-image';

export const runtime = 'edge';
export const alt = 'BragDoc Blog - Insights on Achievement Tracking';
export const size = ogImageSize;
export const contentType = 'image/png';

export default async function Image() {
  return createOGImage({
    title: 'BragDoc Blog',
    subtitle: 'Insights on Achievement Tracking',
    badges: ['Career Growth', 'Engineering', 'Productivity', 'AI'],
  });
}
