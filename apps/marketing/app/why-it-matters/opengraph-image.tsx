import { createOGImage, ogImageSize } from '@/lib/og-image';

export const alt = 'Why Achievement Tracking Matters for Your Career - BragDoc';
export const size = ogImageSize;
export const contentType = 'image/png';

export default async function Image() {
  return createOGImage({
    title: 'Why Achievement Tracking Matters for Your Career',
    items: [
      { label: 'Ace Performance Reviews' },
      { label: 'Build Stronger Resumes' },
      { label: 'Run Better 1:1s' },
    ],
  });
}
