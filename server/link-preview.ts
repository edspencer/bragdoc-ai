// What POST /api/link-preview needs from the outside world: a way to ask GitHub for a pull request's title. Nothing is
// registered until a GitHub source is connected (PR13 registers its lookup here, which goes through ctx.egress or the
// gh CLI and is logged either way). Until then a pasted PR is shown as `owner/repo#n` and nothing leaves the machine;
// other URLs are never fetched at all (SPEC R5).
import type { PrRef } from '../shared/links.js';

export interface PrDetails {
  title: string;
  /** YYYY-MM-DD or an ISO time, when it was merged. */
  mergedAt?: string;
  additions?: number;
  deletions?: number;
}

/** Look a pull request up. Null: GitHub says there's no such PR (or it can't be seen). Throw for anything else. */
export type PrLookup = (pr: PrRef, signal: AbortSignal) => Promise<PrDetails | null>;

/** How long a paste waits for a title before showing `owner/repo#n` instead. */
export const PR_LOOKUP_TIMEOUT_MS = 5000;

export class LinkPreviews {
  private lookup: PrLookup | null = null;
  private active: () => boolean = () => true;

  /**
   * Register (or, with null, unregister) the GitHub lookup. `active` says whether it may be used right now: the GitHub
   * source registers once and answers from config.yaml, so connecting, disconnecting or a hand edit take effect at once.
   */
  setGithub(lookup: PrLookup | null, active: () => boolean = () => true): void {
    this.lookup = lookup;
    this.active = active;
  }

  private get github(): PrLookup | null {
    return this.lookup && this.active() ? this.lookup : null;
  }

  get hasGithub(): boolean {
    return this.github !== null;
  }

  /**
   * The PR's details: `{ details }`, or `{ note }` saying why there are none (not connected, not found, failed). Never
   * throws, and gives up after PR_LOOKUP_TIMEOUT_MS.
   */
  async pr(pr: PrRef, timeoutMs = PR_LOOKUP_TIMEOUT_MS): Promise<{ details: PrDetails } | { note: string }> {
    const lookup = this.github;
    if (!lookup) return { note: 'GitHub isn’t connected, so BragDoc didn’t look up the title.' };
    const ctl = new AbortController();
    const timer = setTimeout(() => ctl.abort(), timeoutMs);
    try {
      const details = await lookup(pr, ctl.signal);
      return details ? { details } : { note: 'GitHub doesn’t know this pull request (or you can’t see it).' };
    } catch (e) {
      return { note: ctl.signal.aborted ? 'GitHub took too long to answer.' : `Couldn’t ask GitHub: ${(e as Error).message}` };
    } finally {
      clearTimeout(timer);
    }
  }
}
