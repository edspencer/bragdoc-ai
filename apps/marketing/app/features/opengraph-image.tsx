import { createOGImage, ogImageSize } from '@/lib/og-image';

export const alt =
  'BragDoc Features - Git-Powered & AI-Enhanced Achievement Tracking';
export const size = ogImageSize;
export const contentType = 'image/png';

export default async function Image() {
  return createOGImage({
    title: 'Achievement Tracking Features',
    subtitle: 'Git-Powered & AI-Enhanced',
    badges: [
      'Automatic Extraction',
      'Dashboard',
      'Project Organization',
      'Standup Mode',
      'AI Documents',
      'Analytics',
    ],
  });
}
