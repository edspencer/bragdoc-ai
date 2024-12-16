import { Metadata } from 'next'

export const defaultMetadata: Metadata = {
  title: {
    default: 'brag.ai - Never Forget Your Achievements',
    template: '%s | brag.ai',
  },
  description: 'brag.ai helps you track your work accomplishments effortlessly. Perfect for performance reviews, resumes, and career growth.',
  keywords: [
    'achievement tracking',
    'performance review',
    'career development',
    'work accomplishments',
    'brag document',
    'GitHub integration',
    'AI assistant',
    'career growth',
  ],
  authors: [{ name: 'brag.ai team' }],
  openGraph: {
    title: 'brag.ai - Never Forget Your Achievements',
    description: 'Track your work accomplishments effortlessly with AI assistance',
    url: 'https://brag.ai',
    siteName: 'brag.ai',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'brag.ai - Never Forget Your Achievements',
    description: 'Track your work accomplishments effortlessly with AI assistance',
  },
  robots: {
    index: true,
    follow: true,
  },
}
