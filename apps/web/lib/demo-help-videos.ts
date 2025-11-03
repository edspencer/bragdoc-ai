/**
 * Demo Help Video Configuration
 *
 * Provides a single video for demo help.
 * Can be overridden via environment variable:
 * - NEXT_PUBLIC_DEMO_HELP_VIDEO_ID
 */

interface DemoHelpVideo {
  youtubeId: string;
  title: string;
  description?: string;
}

// Default placeholder video (can be updated with real ID later)
const DEFAULT_VIDEO: DemoHelpVideo = {
  youtubeId: '-AS45-hLDe0',
  title: 'Getting Started with BragDoc',
  description: 'Learn how to use BragDoc in demo mode',
};

/**
 * Get video configuration for demo help
 * @returns Video configuration with YouTube ID
 */
export function getDemoHelpVideo(): DemoHelpVideo {
  // Check for environment variable override
  const envVideoId = process.env.NEXT_PUBLIC_DEMO_HELP_VIDEO_ID;

  if (envVideoId) {
    return {
      ...DEFAULT_VIDEO,
      youtubeId: envVideoId,
    };
  }

  return DEFAULT_VIDEO;
}
