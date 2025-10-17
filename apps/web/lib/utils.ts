import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

import type { Document } from '@/database/schema';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface ApplicationError extends Error {
  info: string;
  status: number;
}

export const fetcher = async (url: string) => {
  const res = await fetch(url);

  if (!res.ok) {
    const error = new Error(
      'An error occurred while fetching the data.',
    ) as ApplicationError;

    error.info = await res.json();
    error.status = res.status;

    throw error;
  }

  return res.json();
};

export function getLocalStorage(key: string) {
  if (typeof window !== 'undefined') {
    return JSON.parse(localStorage.getItem(key) || '[]');
  }
  return [];
}

export function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export function getDocumentTimestampByIndex(
  documents: Array<Document>,
  index: number,
) {
  if (!documents) return new Date();
  if (index > documents.length) return new Date();

  return documents[index]!.createdAt;
}

export function sanitizeText(text: string) {
  return text.replaceAll('\\n', '\n');
}

export function sanitizeResponseMessages(messages: any[]) {
  // Remove messages with incomplete tool calls (no result)
  return messages.filter((message: any) => {
    if (message.role === 'tool') {
      // Only keep tool messages that have results
      return message.content && message.content.length > 0;
    }
    return true;
  });
}

export function getTextFromMessage(message: any): string {
  if (!message?.parts) {
    return '';
  }

  // Extract text from parts array
  return message.parts
    .filter((part: any) => part.type === 'text')
    .map((part: any) => part.text)
    .join(' ');
}
