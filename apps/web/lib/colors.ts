/**
 * Project color palette - 16 nice colors for project identification
 */
export const PROJECT_COLORS = [
  '#3B82F6', // blue-500
  '#10B981', // emerald-500
  '#F59E0B', // amber-500
  '#EF4444', // red-500
  '#8B5CF6', // violet-500
  '#06B6D4', // cyan-500
  '#F97316', // orange-500
  '#84CC16', // lime-500
  '#EC4899', // pink-500
  '#6366F1', // indigo-500
  '#14B8A6', // teal-500
  '#FACC15', // yellow-400
  '#A855F7', // purple-500
  '#0EA5E9', // sky-500
  '#FB923C', // orange-400
  '#22C55E', // green-500
] as const;

/**
 * Color names corresponding to the PROJECT_COLORS array
 */
export const PROJECT_COLOR_NAMES = [
  'Blue',
  'Emerald',
  'Amber',
  'Red',
  'Violet',
  'Cyan',
  'Orange',
  'Lime',
  'Pink',
  'Indigo',
  'Teal',
  'Yellow',
  'Purple',
  'Sky',
  'Coral',
  'Green',
] as const;

/**
 * Get the color hex value by index
 */
export function getProjectColor(colorIndex: number): string {
  return PROJECT_COLORS[colorIndex % PROJECT_COLORS.length]!;
}

/**
 * Get the color name by index
 */
export function getProjectColorName(colorIndex: number): string {
  return PROJECT_COLOR_NAMES[colorIndex % PROJECT_COLOR_NAMES.length]!;
}

/**
 * Get the color index from hex value
 */
export function getColorIndex(hexColor: string): number {
  const index = PROJECT_COLORS.indexOf(
    hexColor as (typeof PROJECT_COLORS)[number],
  );
  return index === -1 ? 0 : index;
}

/**
 * Get the next available color for a user's projects
 * Used for round-robin color assignment
 */
export function getNextProjectColor(existingProjectCount: number): {
  hex: string;
  index: number;
  name: string;
} {
  const index = existingProjectCount % PROJECT_COLORS.length;
  return {
    hex: PROJECT_COLORS[index]!,
    index,
    name: PROJECT_COLOR_NAMES[index]!,
  };
}
