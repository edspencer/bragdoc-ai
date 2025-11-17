/**
 * FrameIt.dev API integration for generating Open Graph images
 * @see https://frameit.dev
 */

export interface FrameItParams {
  /** Main heading text */
  title: string;
  /** Secondary text */
  subtitle?: string;
  /** Layout type */
  layout?: 'open-graph' | 'youtube' | 'twitter-x';
  /** Specific layout variant */
  layoutId?: 'classic' | 'minimal' | 'photo-essay';
  /** Gradient preset */
  background?: 'default' | 'sunset' | 'ocean-blue' | 'forest-green' | 'purple';
  /** Output format */
  format?: 'png' | 'webp';
  /** Hex color for title text (without #) */
  titleColor?: string;
  /** Hex color for subtitle text (without #) */
  subtitleColor?: string;
  /** Custom logo image URL */
  logoUrl?: string;
  /** Logo transparency (0.0-1.0) */
  logoOpacity?: number;
}

const FRAMEIT_HOST = 'https://frameit.dev';

/**
 * Generates a FrameIt.dev URL for creating Open Graph images
 */
export function generateFrameItUrl(params: FrameItParams): string {
  const searchParams = new URLSearchParams();

  // Set defaults
  const layout = params.layout || 'open-graph';
  const format = params.format || 'png';

  searchParams.set('layout', layout);
  searchParams.set('title', params.title);
  searchParams.set('format', format);

  if (params.subtitle) {
    searchParams.set('subtitle', params.subtitle);
  }

  if (params.layoutId) {
    searchParams.set('layoutId', params.layoutId);
  }

  if (params.background) {
    searchParams.set('background', params.background);
  }

  if (params.titleColor) {
    searchParams.set('titleColor', params.titleColor);
  }

  if (params.subtitleColor) {
    searchParams.set('subtitleColor', params.subtitleColor);
  }

  if (params.logoUrl) {
    searchParams.set('logoUrl', params.logoUrl);
  }

  if (params.logoOpacity !== undefined) {
    searchParams.set('logoOpacity', params.logoOpacity.toString());
  }

  return `${FRAMEIT_HOST}/api/generate?${searchParams.toString()}`;
}
