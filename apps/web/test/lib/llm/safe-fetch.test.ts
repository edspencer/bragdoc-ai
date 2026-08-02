import { BlockedRedirectError, createSSRFSafeFetch } from 'lib/llm/safe-fetch';

/**
 * The verification probe's HTTP client follows redirects by default, so a
 * public base URL can 307 the probe onto an internal address. These tests
 * pin the guard: every hop is re-validated, and a disallowed one throws a
 * tagged error rather than being fetched.
 */
describe('createSSRFSafeFetch', () => {
  const originalEnv = process.env.BYOK_ALLOW_PRIVATE_BASEURLS;

  beforeEach(() => {
    delete process.env.BYOK_ALLOW_PRIVATE_BASEURLS;
  });

  afterAll(() => {
    if (originalEnv === undefined) {
      delete process.env.BYOK_ALLOW_PRIVATE_BASEURLS;
    } else {
      process.env.BYOK_ALLOW_PRIVATE_BASEURLS = originalEnv;
    }
  });

  const redirect = (location: string, status = 307) =>
    new Response(null, { status, headers: { location } });

  const ok = (body = 'ok') => new Response(body, { status: 200 });

  /** jest.fn() typed with fetch's argument list so mock.calls is indexable. */
  const stubFetch = (impl: () => Promise<Response>) =>
    jest.fn((_url: RequestInfo | URL, _init?: RequestInit) => impl());

  it('always requests with redirect: manual so the runtime cannot follow hops for us', async () => {
    const base = stubFetch(async () => ok());
    const safeFetch = createSSRFSafeFetch(base as unknown as typeof fetch);

    await safeFetch('https://api.example.com/v1/chat', { method: 'POST' });

    expect(base).toHaveBeenCalledTimes(1);
    expect(base.mock.calls[0]?.[1]).toMatchObject({ redirect: 'manual' });
  });

  it('returns non-redirect responses untouched', async () => {
    const base = jest.fn(async () => ok('hello'));
    const safeFetch = createSSRFSafeFetch(base as unknown as typeof fetch);

    const response = await safeFetch('https://api.example.com/v1');

    expect(response.status).toBe(200);
    expect(await response.text()).toBe('hello');
  });

  it('refuses a redirect to the cloud metadata endpoint and never fetches it', async () => {
    const base = stubFetch(async () =>
      redirect('http://169.254.169.254/latest/meta-data/'),
    );
    const safeFetch = createSSRFSafeFetch(base as unknown as typeof fetch);

    await expect(
      safeFetch('https://evil.example.com/v1/chat', { method: 'POST' }),
    ).rejects.toThrow(BlockedRedirectError);

    // Only the original (public) URL was ever requested
    expect(base).toHaveBeenCalledTimes(1);
    expect(base.mock.calls[0]?.[0]).toBe('https://evil.example.com/v1/chat');
  });

  it('tags the blocked-redirect error so verification classifies it safely', async () => {
    const base = jest.fn(async () => redirect('http://127.0.0.1:11434/api'));
    const safeFetch = createSSRFSafeFetch(base as unknown as typeof fetch);

    const error = await safeFetch('https://evil.example.com/v1').catch(
      (e) => e,
    );

    expect(error).toBeInstanceOf(BlockedRedirectError);
    expect(error.llmVerificationCode).toBe('blocked_redirect');
    expect(error.message).toMatch(/private or internal/i);
  });

  it.each([
    301, 302, 303, 307, 308,
  ])('refuses an internal redirect delivered as %i', async (status) => {
    const base = jest.fn(async () =>
      redirect('http://[::ffff:169.254.169.254]/', status),
    );
    const safeFetch = createSSRFSafeFetch(base as unknown as typeof fetch);

    await expect(safeFetch('https://evil.example.com/v1')).rejects.toThrow(
      BlockedRedirectError,
    );
  });

  it('resolves relative Location headers against the current URL before checking them', async () => {
    const base = jest
      .fn()
      .mockResolvedValueOnce(redirect('/v2/chat'))
      .mockResolvedValueOnce(ok('followed'));
    const safeFetch = createSSRFSafeFetch(base as unknown as typeof fetch);

    const response = await safeFetch('https://api.example.com/v1/chat');

    expect(await response.text()).toBe('followed');
    expect(base.mock.calls[1][0]).toBe('https://api.example.com/v2/chat');
  });

  it('follows a redirect between public hosts', async () => {
    const base = jest
      .fn()
      .mockResolvedValueOnce(redirect('https://api2.example.com/v1'))
      .mockResolvedValueOnce(ok('followed'));
    const safeFetch = createSSRFSafeFetch(base as unknown as typeof fetch);

    const response = await safeFetch('https://api.example.com/v1');

    expect(await response.text()).toBe('followed');
    expect(base).toHaveBeenCalledTimes(2);
  });

  it('downgrades a 303 to a bodyless GET, but replays method and body on a 307', async () => {
    const base303 = jest
      .fn()
      .mockResolvedValueOnce(redirect('https://api2.example.com/v1', 303))
      .mockResolvedValueOnce(ok());
    const safe303 = createSSRFSafeFetch(base303 as unknown as typeof fetch);
    await safe303('https://api.example.com/v1', {
      method: 'POST',
      body: '{"a":1}',
    });
    expect(base303.mock.calls[1][1]).toMatchObject({
      method: 'GET',
      body: undefined,
    });

    const base307 = jest
      .fn()
      .mockResolvedValueOnce(redirect('https://api2.example.com/v1', 307))
      .mockResolvedValueOnce(ok());
    const safe307 = createSSRFSafeFetch(base307 as unknown as typeof fetch);
    await safe307('https://api.example.com/v1', {
      method: 'POST',
      body: '{"a":1}',
    });
    expect(base307.mock.calls[1][1]).toMatchObject({
      method: 'POST',
      body: '{"a":1}',
    });
  });

  it('gives up after too many redirects', async () => {
    const base = jest.fn(async () => redirect('https://api.example.com/next'));
    const safeFetch = createSSRFSafeFetch(base as unknown as typeof fetch);

    await expect(safeFetch('https://api.example.com/v1')).rejects.toThrow(
      /redirected too many times/i,
    );
  });

  it('returns a 3xx without a Location header as-is', async () => {
    const base = jest.fn(async () => new Response(null, { status: 302 }));
    const safeFetch = createSSRFSafeFetch(base as unknown as typeof fetch);

    const response = await safeFetch('https://api.example.com/v1');

    expect(response.status).toBe(302);
    expect(base).toHaveBeenCalledTimes(1);
  });

  it('rejects an initial URL that is itself internal', async () => {
    const base = jest.fn(async () => ok());
    const safeFetch = createSSRFSafeFetch(base as unknown as typeof fetch);

    await expect(safeFetch('http://localhost:11434/api')).rejects.toThrow(
      BlockedRedirectError,
    );
    expect(base).not.toHaveBeenCalled();
  });

  it('honours BYOK_ALLOW_PRIVATE_BASEURLS for self-hosted deployments', async () => {
    process.env.BYOK_ALLOW_PRIVATE_BASEURLS = 'true';
    const base = jest
      .fn()
      .mockResolvedValueOnce(redirect('http://127.0.0.1:11434/api'))
      .mockResolvedValueOnce(ok('local'));
    const safeFetch = createSSRFSafeFetch(base as unknown as typeof fetch);

    const response = await safeFetch('http://localhost:11434/api');

    expect(await response.text()).toBe('local');
    expect(base).toHaveBeenCalledTimes(2);
  });
});
