// repos/<id>.yaml: a code repository, found by onboarding's folder scan, PR discovery, or added by hand.
import { z } from 'zod';
import { example, id, schemaVersion } from './common.js';

export const RepoSchema = z
  .object({
    schemaVersion,
    id,
    name: z.string().min(1).describe('A short name, usually `owner/repo` or the folder name.'),
    localPath: z.string().optional().describe('Where it is checked out on this machine (absolute, `~` allowed).'),
    remoteUrl: z.string().optional().describe('Its remote, e.g. `https://github.com/owner/repo`.'),
    host: z.string().default('local').describe('Where it\'s hosted (`github.com`), or `local` for a checkout with no known remote.'),
    tracked: z.boolean().default(true).describe('`false` hides it from suggestions without forgetting it.'),
    example,
  })
  .refine((r) => r.localPath || r.remoteUrl, { message: 'give a localPath, a remoteUrl, or both', path: ['localPath'] });
export type Repo = z.infer<typeof RepoSchema>;
