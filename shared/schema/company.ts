// companies/<id>.yaml: somewhere you worked. Optional: projects can have no company.
import { z } from 'zod';
import { example, id, isoDate, schemaVersion } from './common.js';

export const CompanySchema = z.object({
  schemaVersion,
  id,
  name: z.string().min(1).describe('The company\'s name.'),
  role: z.string().optional().describe('Your role there.'),
  start: isoDate.optional().describe('When you started, YYYY-MM-DD.'),
  end: isoDate.nullable().default(null).describe('When you left; empty while you still work there.'),
  legacyId: z.string().optional().describe('Its id in the hosted BragDoc, for imported companies (re-importing skips it).'),
  example,
});
export type Company = z.infer<typeof CompanySchema>;
