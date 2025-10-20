import type { MetadataRoute } from 'next';
import Posts from '../lib/blog/Posts';

const SITE = 'https://www.bragdoc.ai';

export default function sitemap(): MetadataRoute.Sitemap {
  const publishedPosts = new Posts().publishedPosts;
  const fallbackDate = publishedPosts[0]?.date || new Date().toISOString();

  const postUrls: MetadataRoute.Sitemap = publishedPosts.map((post) => ({
    url: post.link as string,
    lastModified: toW3CDateForFlorida(post.date),
    changeFrequency: 'monthly',
  }));

  const pageUrls: MetadataRoute.Sitemap = [
    {
      url: `${SITE}`,
      lastModified: toW3CDateForFlorida(fallbackDate),
      changeFrequency: 'daily',
    },
    {
      url: `${SITE}/what`,
      lastModified: toW3CDateForFlorida(fallbackDate),
      changeFrequency: 'monthly',
    },
    {
      url: `${SITE}/why`,
      lastModified: toW3CDateForFlorida(fallbackDate),
      changeFrequency: 'monthly',
    },
    {
      url: `${SITE}/how`,
      lastModified: toW3CDateForFlorida(fallbackDate),
      changeFrequency: 'monthly',
    },
    {
      url: `${SITE}/blog`,
      lastModified: toW3CDateForFlorida(fallbackDate),
      changeFrequency: 'weekly',
    },
    {
      url: `${SITE}/feed`,
      lastModified: toW3CDateForFlorida(fallbackDate),
      changeFrequency: 'daily',
    },
  ];

  return [...postUrls, ...pageUrls];
}

function toW3CDateForFlorida(dateString: string) {
  const date = new Date(dateString);

  // Options for formatting in W3C datetime format
  const options: Intl.DateTimeFormatOptions = {
    timeZone: 'America/New_York', // Florida's time zone
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  };

  // Create a formatted string with the proper time zone
  const formatter = new Intl.DateTimeFormat('en-US', options);
  const parts = formatter.formatToParts(date);

  // Extract the parts
  const year = parts.find((part) => part.type === 'year')?.value;
  const month = parts.find((part) => part.type === 'month')?.value;
  const day = parts.find((part) => part.type === 'day')?.value;
  const hour = parts.find((part) => part.type === 'hour')?.value;
  const minute = parts.find((part) => part.type === 'minute')?.value;
  const second = parts.find((part) => part.type === 'second')?.value;

  // Get the timezone offset in hours and minutes
  const timezoneOffsetMinutes = -date.getTimezoneOffset();
  const offsetHours = Math.floor(Math.abs(timezoneOffsetMinutes) / 60)
    .toString()
    .padStart(2, '0');
  const offsetMinutes = (Math.abs(timezoneOffsetMinutes) % 60)
    .toString()
    .padStart(2, '0');
  const sign = timezoneOffsetMinutes >= 0 ? '+' : '-';

  // Return the date in W3C datetime format
  return `${year}-${month}-${day}T${hour}:${minute}:${second}${sign}${offsetHours}:${offsetMinutes}`;
}
