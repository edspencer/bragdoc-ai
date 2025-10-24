import { createOGImage, ogImageSize } from '@/lib/og-image';

export const alt = 'BragDoc FAQ - Achievement Tracking Questions Answered';
export const size = ogImageSize;
export const contentType = 'image/png';

export default async function Image() {
  return createOGImage({
    title: 'BragDoc FAQ',
    subtitle: '60+ Questions Answered',
    badges: [
      'Getting Started',
      'Privacy',
      'Pricing',
      'Features',
      'CLI',
      'Integrations',
    ],
  });
}
