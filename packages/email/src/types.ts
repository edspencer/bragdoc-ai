import { z } from 'zod';

export const EmailType = z.enum([
  'welcome',
  'weekly_summary',
  'achievement_verification',
  'marketing',
  'system_notifications',
]);

export type EmailType =
  | 'welcome'
  | 'weekly_summary'
  | 'monthly_summary'
  | 'achievement_reminder';

export interface UnsubscribeData {
  userId: string;
  emailType?: EmailType;
  token: string;
}
