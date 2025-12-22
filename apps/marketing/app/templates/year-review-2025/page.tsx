import type { Metadata } from 'next';
import { YearReviewWorksheet } from '@/components/templates/year-review-worksheet';

export const metadata: Metadata = {
  title: '2025 Year in Review Worksheet for Developers | BragDoc',
  description:
    'Free printable worksheet for developers to document 2025 achievements across six types of impact. Download as PDF or complete online.',
  keywords:
    'year in review template, developer achievements, performance review template, brag document, career documentation',
  alternates: {
    canonical: '/templates/year-review-2025',
  },
  openGraph: {
    title: '2025 Year in Review Worksheet for Developers',
    description:
      'Free printable worksheet for developers to document 2025 achievements. Download as PDF.',
    type: 'website',
  },
};

export default function YearReview2025Page() {
  return <YearReviewWorksheet />;
}
