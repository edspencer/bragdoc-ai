// The instructions files (ai/what-counts.md, ai/style.md; D67): what you tell the models, as markdown you can edit
// here or by hand. Written whole, as the editor shows them. A feature reads one with `forPrompt(name)`; Reset puts a
// feature's starter back, after moving your version into backups/removed/ (nothing is deleted).
import { z } from 'zod';
import { INSTRUCTIONS_INFO, INSTRUCTIONS_MAX_CHARS, isInstructionsName, type InstructionsName } from '../../shared/ai/instructions.js';
import type { AiInstructionsReset, AiInstructionsResponse } from '../../shared/api.js';
import { ConflictError, NotFoundError, type Store, type WriteOptions } from '../store/index.js';
import { validate } from './util.js';

const PutSchema = z.strictObject({ text: z.string() });

export class InstructionsService {
  private starters = new Map<InstructionsName, () => string>();

  constructor(private store: Store) {}

  private name(name: string): InstructionsName {
    if (!isInstructionsName(name)) throw new NotFoundError(`there are no instructions called ${JSON.stringify(name)} (there's ${Object.keys(INSTRUCTIONS_INFO).join(' and ')})`);
    return name;
  }

  get(name: string): AiInstructionsResponse {
    const n = this.name(name);
    const e = this.store.entry('instructions', n);
    return {
      name: n,
      file: e?.file ?? INSTRUCTIONS_INFO[n].file,
      exists: e?.raw != null,
      text: e?.raw ?? null,
      body: e?.value?.body ?? null,
      etag: e?.etag ?? null,
      problems: e?.problems ?? [],
      readOnly: e?.readOnly ?? false,
      hasStarter: this.starters.has(n),
      maxChars: INSTRUCTIONS_MAX_CHARS,
    };
  }

  /**
   * What a prompt includes: the file's markdown, trimmed, or null if there's none. While the file is broken it's the
   * last good copy this server read; a server started with the file already broken has none (null), so a feature that
   * needs instructions should also look at `get(name).problems` and say so.
   */
  forPrompt(name: InstructionsName): string | null {
    const body = this.store.get('instructions', name)?.body.trim();
    return body ? body : null;
  }

  /** Replace the file with `{ text }`: the whole file. A broken file needs `ifMatch` (its ETag) to be replaced. */
  put(name: string, input: unknown, opts: Pick<WriteOptions, 'ifMatch'> = {}): AiInstructionsResponse {
    const n = this.name(name);
    const { text } = validate(PutSchema, input);
    this.store.writeText('instructions', n, text, opts);
    return this.get(n);
  }

  /**
   * A feature's starter text for `name`, which Reset puts back (the judge's is made from your profile, PR24). Written
   * only by `reset()` or `ensure()`, never by registering. Returns the unregister function.
   */
  setStarter(name: InstructionsName, starter: () => string): () => void {
    this.starters.set(name, starter);
    return () => {
      if (this.starters.get(name) === starter) this.starters.delete(name);
    };
  }

  /**
   * Put the starter back (`starter`, else the registered one). Your current file, if it's any different, is moved
   * into backups/removed/ first, broken or not: it's yours, and Reset is how you get out of a file you've lost track of.
   */
  reset(name: string, starter?: string): AiInstructionsReset {
    const n = this.name(name);
    const text = starter ?? this.starters.get(n)?.();
    if (text === undefined) throw new NotFoundError(`nothing has a starter for ${INSTRUCTIONS_INFO[n].file} yet (it comes with the feature that reads it)`);
    // the starter is checked before anything moves: a bad one must not leave you with no file at all
    this.store.assertWritableText('instructions', n, text);
    const e = this.store.entry('instructions', n);
    let removedTo: string | null = null;
    if (e?.raw != null && e.raw !== text) removedTo = this.store.remove('instructions', n);
    if (e?.raw !== text) {
      try {
        this.store.writeText('instructions', n, text, { createOnly: true });
      } catch (err) {
        // someone made the file meanwhile: theirs stays, and yours comes back only if the place is still empty
        if (removedTo && this.store.entry('instructions', n)?.raw == null) this.store.restore('instructions', n);
        throw err;
      }
    }
    return { ...this.get(n), removedTo };
  }

  /** Write the starter if there's no file yet (a feature switched on for the first time); never replaces one. */
  ensure(name: InstructionsName, starter: string): AiInstructionsResponse {
    if (this.store.entry('instructions', name)?.raw == null) {
      try {
        this.store.writeText('instructions', name, starter, { createOnly: true });
      } catch (e) {
        if (!(e instanceof ConflictError)) throw e; // someone made it meanwhile: theirs wins
      }
    }
    return this.get(name);
  }
}
