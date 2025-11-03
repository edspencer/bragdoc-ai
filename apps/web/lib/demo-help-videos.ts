/**
 * Demo Help Video Configuration
 *
 * Provides video IDs for each demo help page.
 * Can be overridden via environment variables:
 * - NEXT_PUBLIC_DEMO_HELP_DASHBOARD_VIDEO_ID
 * - NEXT_PUBLIC_DEMO_HELP_REPORTS_VIDEO_ID
 */

interface DemoHelpVideo {
  youtubeId: string;
  title: string;
  description?: string;
}

// Default placeholder video IDs (can be updated with real IDs later)
const DEFAULT_VIDEOS: Record<'dashboard' | 'reports', DemoHelpVideo> = {
  dashboard: {
    youtubeId: 'dQw4w9WgXcQ', // Placeholder
    title: 'Getting Started with BragDoc Dashboard',
    description:
      'Learn how to navigate the dashboard and view your achievements',
  },
  reports: {
    youtubeId: 'dQw4w9WgXcQ', // Placeholder
    title: 'Reports Overview',
    description: 'Learn how to create and manage achievement reports',
  },
};

/**
 * Get video configuration for a demo help page
 * @param page - Page identifier ('dashboard' | 'reports')
 * @returns Video configuration with YouTube ID
 */
export function getDemoHelpVideo(page: 'dashboard' | 'reports'): DemoHelpVideo {
  // Check for environment variable overrides
  const envVarKey = `NEXT_PUBLIC_DEMO_HELP_${page.toUpperCase()}_VIDEO_ID`;
  const envVideoId = process.env[envVarKey];

  const defaultVideo = DEFAULT_VIDEOS[page];

  if (envVideoId) {
    return {
      ...defaultVideo,
      youtubeId: envVideoId,
    };
  }

  return defaultVideo;
}
