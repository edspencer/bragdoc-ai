/**
 * SSRF-safe `fetch` for the BYOK verification probe.
 *
 * `validateBaseURL` only sees the URL the user submitted. The AI SDK's HTTP
 * client calls `fetch(url, init)` with no `redirect` option, so the runtime
 * follows redirects transparently — a user can host a perfectly public base
 * URL that answers `307 Location: http://169.254.169.254/latest/meta-data/`
 * and the probe will happily go there.
 *
 * This wrapper sets `redirect: 'manual'` and re-runs `validateBaseURL`
 * against every hop before following it, so the allow/deny decision is made
 * for each address the probe actually contacts, not just the first. It is
 * passed into `verifyLLMConfig` (and thence to the `@ai-sdk/*` provider
 * factories, which all accept a custom `fetch`).
 *
 * Residual risk: this is still name-based, not address-based. A hostname
 * that resolves to a private IP — including one that changes between the
 * check and the connect (DNS rebinding) — is not caught here or in
 * `validateBaseURL`. Closing that requires resolving and pinning the address
 * the socket connects to, which neither the Workers runtime nor `undici`'s
 * default agent exposes to us.
 */

import { validateBaseURL } from './validate-base-url';

/** Redirect hops the probe will follow before giving up. */
const MAX_REDIRECTS = 3;

const REDIRECT_STATUSES = new Set([301, 302, 303, 307, 308]);

/**
 * Thrown when a hop is refused. Carries `llmVerificationCode` so
 * `verifyLLMConfig` classifies the failure as `blocked_redirect` rather than
 * describing it from provider-supplied text.
 */
export class BlockedRedirectError extends Error {
  readonly llmVerificationCode = 'blocked_redirect';

  constructor(message: string) {
    super(message);
    this.name = 'BlockedRedirectError';
  }
}

function requestURL(input: RequestInfo | URL): string {
  if (typeof input === 'string') return input;
  if (input instanceof URL) return input.toString();
  return input.url;
}

/**
 * Build a `fetch` that never follows a redirect to an address
 * `validateBaseURL` would reject.
 *
 * Only the `(url, init)` call shape is supported, which is the only shape the
 * AI SDK's `postJsonToApi`/`getFromApi` use; a `Request` instance is read for
 * its URL only.
 */
export function createSSRFSafeFetch(
  baseFetch: typeof globalThis.fetch = globalThis.fetch,
): typeof globalThis.fetch {
  return async function ssrfSafeFetch(
    input: RequestInfo | URL,
    init?: RequestInit,
  ): Promise<Response> {
    let url = requestURL(input);
    let requestInit: RequestInit = { ...init, redirect: 'manual' };

    for (let hop = 0; ; hop++) {
      if (!validateBaseURL(url).ok) {
        throw new BlockedRedirectError(
          hop === 0
            ? 'The configured endpoint is not an allowed address.'
            : 'The endpoint redirected the request to a private or internal ' +
                'address, which is not allowed.',
        );
      }

      const response = await baseFetch(url, requestInit);

      if (!REDIRECT_STATUSES.has(response.status)) return response;

      const location = response.headers.get('location');
      // A 3xx without Location is not a redirect we can follow; let the
      // caller deal with the response as-is.
      if (!location) return response;

      if (hop >= MAX_REDIRECTS) {
        throw new BlockedRedirectError(
          'The endpoint redirected too many times.',
        );
      }

      let next: string;
      try {
        next = new URL(location, url).toString();
      } catch {
        throw new BlockedRedirectError(
          'The endpoint returned an invalid redirect.',
        );
      }

      // Match the fetch spec's method rewrite: 303 always becomes a bodyless
      // GET, and 301/302 do too for POST. 307/308 replay method and body.
      const method = (requestInit.method ?? 'GET').toUpperCase();
      if (
        response.status === 303 ||
        ((response.status === 301 || response.status === 302) &&
          method === 'POST')
      ) {
        requestInit = { ...requestInit, method: 'GET', body: undefined };
      }

      url = next;
    }
  };
}
