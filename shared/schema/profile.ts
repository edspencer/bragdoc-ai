// profile.yaml: who you are. Onboarding (PR16) writes it; its absence is what "first run" means. The screenshot rules
// (PR11) match your name, handles and aliases in OCR text, minus `notMe`.
import { z } from 'zod';
import { schemaVersion } from './common.js';

export const ProfileSchema = z.object({
  schemaVersion,
  name: z.string().min(1).describe('Your name, as colleagues write it.'),
  role: z.string().optional().describe('Your role or job title.'),
  githubLogin: z.string().optional().describe('Your GitHub username.'),
  aliases: z.array(z.string().min(1)).default([]).describe('What people call you at work: nicknames, handles, initials.'),
  notMe: z.array(z.string().min(1)).default([]).describe('Names that look like yours but aren\'t you (the rules skip them).'),
  emails: z.array(z.string().min(1)).default([]).describe('Your work and personal email addresses.'),
  timezone: z.string().optional().describe('An IANA time zone, e.g. `Europe/London`. Defaults to the machine\'s.'),
});
export type Profile = z.infer<typeof ProfileSchema>;
