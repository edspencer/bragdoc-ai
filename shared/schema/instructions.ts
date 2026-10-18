// ai/<name>.md: an instructions file (v0.2, D67). Markdown, with optional front-matter; the markdown is what the
// models read. The front-matter has no keys of its own yet beyond the version: anything else in it is kept, unread.
import { z } from 'zod';
import { schemaVersion } from './common.js';

export const InstructionsFrontMatterSchema = z.object({
  schemaVersion,
});
export type Instructions = z.infer<typeof InstructionsFrontMatterSchema> & {
  /** The markdown after the front-matter (all of the file when it has none). */
  body: string;
};
