import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Generate a URL to the BragDoc web application
 * @param path - Path to append (e.g., "/login", "/dashboard")
 * @returns Full URL to the app (e.g., "https://app.bragdoc.ai/login")
 */
export function appPath(path: string): string {
  const host = process.env.APP_HOST || 'app.bragdoc.ai';
  // Ensure we have https:// prefix
  const baseUrl = host.startsWith('http') ? host : `https://${host}`;
  // Remove trailing slash from base and leading slash from path to avoid double slashes
  const cleanBase = baseUrl.replace(/\/$/, '');
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  return `${cleanBase}${cleanPath}`;
}

/**
 * Generate a URL to the BragDoc login page
 * @returns Full URL to the login page
 */
export function loginPath(): string {
  return appPath('/login');
}
