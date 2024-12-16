import { Metadata } from 'next'

export const defaultMetadata: Metadata = {
  title: {
    default: 'bragdoc.ai - Never Forget Your Achievements',
    template: '%s | bragdoc.ai',
  },
  description: 'bragdoc.ai helps you track your work accomplishments effortlessly. Perfect for performance reviews, resumes, and career growth.',
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
  authors: [{ name: 'bragdoc.ai team' }],
  openGraph: {
    title: 'bragdoc.ai - Never Forget Your Achievements',
    description: 'Track your work accomplishments effortlessly with AI assistance',
    url: 'https://bragdoc.ai',
    siteName: 'bragdoc.ai',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'bragdoc.ai - Never Forget Your Achievements',
    description: 'Track your work accomplishments effortlessly with AI assistance',
  },
  robots: {
    index: true,
    follow: true,
  },
}
