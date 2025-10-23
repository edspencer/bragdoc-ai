import { createOGImage, ogImageSize } from '@/lib/og-image';

export const runtime = 'nodejs';
export const alt = 'BragDoc Use Cases - Performance Reviews, Resumes & More';
export const size = ogImageSize;
export const contentType = 'image/png';

export default async function Image() {
  return createOGImage({
    title: 'BragDoc Use Cases',
    badges: [
      'Performance Reviews',
      'Resume Building',
      '1:1 Meetings',
      'Job Interviews',
      'Promotion Packets',
      'Weekly Reports',
    ],
  });
}
