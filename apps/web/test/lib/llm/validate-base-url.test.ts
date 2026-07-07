import { validateBaseURL } from 'lib/llm/validate-base-url';

describe('validateBaseURL', () => {
  const originalEnv = process.env.BYOK_ALLOW_PRIVATE_BASEURLS;

  afterEach(() => {
    if (originalEnv === undefined) {
      delete process.env.BYOK_ALLOW_PRIVATE_BASEURLS;
    } else {
      process.env.BYOK_ALLOW_PRIVATE_BASEURLS = originalEnv;
    }
  });

  describe('public URLs', () => {
    it('accepts a public https URL', () => {
      expect(validateBaseURL('https://api.example.com/v1')).toEqual({
        ok: true,
      });
    });

    it('accepts a public http URL', () => {
      expect(validateBaseURL('http://ollama.example.com:11434/api')).toEqual({
        ok: true,
      });
    });

    it('accepts a public IPv4 literal', () => {
      expect(validateBaseURL('http://8.8.8.8/v1')).toEqual({ ok: true });
    });

    it('accepts a public IPv6 literal', () => {
      expect(validateBaseURL('http://[2001:db8::1]/v1')).toEqual({ ok: true });
    });
  });

  describe('malformed and non-http URLs', () => {
    it('rejects garbage that does not parse as a URL', () => {
      const result = validateBaseURL('not a url at all');
      expect(result.ok).toBe(false);
    });

    it('rejects ftp: URLs', () => {
      const result = validateBaseURL('ftp://example.com/');
      expect(result).toEqual({
        ok: false,
        reason: 'Base URL must use http or https',
      });
    });

    it('rejects file: URLs', () => {
      expect(validateBaseURL('file:///etc/passwd').ok).toBe(false);
    });

    it('rejects URLs with embedded credentials', () => {
      const result = validateBaseURL('https://user:pass@example.com/v1');
      expect(result).toEqual({
        ok: false,
        reason: 'Base URL must not contain embedded credentials',
      });
    });
  });

  describe('private/internal addresses (rejected by default)', () => {
    beforeEach(() => {
      delete process.env.BYOK_ALLOW_PRIVATE_BASEURLS;
    });

    const privateURLs = [
      'http://localhost:11434/api',
      'http://sub.localhost/',
      'http://myhost.local:11434/',
      'http://api.internal/v1',
      'http://127.0.0.1:11434/api',
      'http://127.53.1.2/',
      'http://10.0.0.5:8080/',
      'http://172.16.0.1/',
      'http://172.31.255.254/',
      'http://192.168.1.100:11434/',
      'http://169.254.169.254/latest/meta-data/',
      'http://0.0.0.0:11434/',
      'http://[::1]:11434/api',
      'http://[fc00::1]/',
      'http://[fd12:3456::1]/',
      'http://[fe80::1]/',
      'http://[::]/',
      'http://[::ffff:192.168.1.1]:11434/',
    ];

    it.each(privateURLs)('rejects %s', (url) => {
      const result = validateBaseURL(url);
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.reason).toMatch(/publicly reachable/i);
      }
    });

    it('rejects hex/octal IPv4 encodings of loopback (URL normalizes them)', () => {
      expect(validateBaseURL('http://0x7f000001/').ok).toBe(false);
      expect(validateBaseURL('http://0177.0.0.1/').ok).toBe(false);
    });

    it('does not treat 172.32.x.x (outside 172.16/12) as private', () => {
      expect(validateBaseURL('http://172.32.0.1/')).toEqual({ ok: true });
    });
  });

  describe('with BYOK_ALLOW_PRIVATE_BASEURLS=true (self-hosted)', () => {
    beforeEach(() => {
      process.env.BYOK_ALLOW_PRIVATE_BASEURLS = 'true';
    });

    it('allows localhost', () => {
      expect(validateBaseURL('http://localhost:11434/api')).toEqual({
        ok: true,
      });
    });

    it('allows LAN IPv4 addresses', () => {
      expect(validateBaseURL('http://192.168.1.100:11434/api')).toEqual({
        ok: true,
      });
      expect(validateBaseURL('http://10.0.0.5:11434/')).toEqual({ ok: true });
    });

    it('allows IPv6 loopback', () => {
      expect(validateBaseURL('http://[::1]:11434/api')).toEqual({ ok: true });
    });

    it('still rejects non-http protocols', () => {
      expect(validateBaseURL('ftp://localhost/').ok).toBe(false);
    });

    it('still rejects embedded credentials', () => {
      expect(validateBaseURL('http://user:pass@localhost:11434/').ok).toBe(
        false,
      );
    });
  });

  it('rejects private addresses when the env var is set but not "true"', () => {
    process.env.BYOK_ALLOW_PRIVATE_BASEURLS = '1';
    expect(validateBaseURL('http://localhost:11434/api').ok).toBe(false);
  });
});
