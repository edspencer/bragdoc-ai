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
      // IPv4-compatible IPv6 (deprecated ::a.b.c.d form) — the URL parser
      // hands these to us as ::7f00:1 / ::a9fe:a9fe
      'http://[::127.0.0.1]/',
      'http://[::7f00:1]/',
      'http://[::169.254.169.254]/latest/meta-data/',
      // RFC 6598 CGNAT, which holds Alibaba's metadata endpoint
      'http://100.64.0.1/',
      'http://100.100.100.200/latest/meta-data/',
      'http://100.127.255.254/',
      // 192.0.0.0/24 IETF protocol assignments
      'http://192.0.0.1/',
      'http://192.0.0.170/',
      // NAT64 well-known prefix wrapping the link-local metadata address
      'http://[64:ff9b::a9fe:a9fe]/latest/meta-data/',
      'http://[64:ff9b::169.254.169.254]/',
      'http://[64:ff9b::c0a8:1]/',
      // 6to4 wrapping a private IPv4
      'http://[2002:a9fe:a9fe::1]/',
      'http://[2002:c0a8:0101::1]/',
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

    it('does not treat 100.x outside the CGNAT /10 as private', () => {
      expect(validateBaseURL('http://100.63.255.255/')).toEqual({ ok: true });
      expect(validateBaseURL('http://100.128.0.1/')).toEqual({ ok: true });
    });

    it('does not treat 192.0.1.x (outside 192.0.0.0/24) as private', () => {
      expect(validateBaseURL('http://192.0.1.1/')).toEqual({ ok: true });
    });

    it('allows NAT64 and 6to4 addresses wrapping a public IPv4', () => {
      // 8.8.8.8 == 0808:0808
      expect(validateBaseURL('http://[64:ff9b::808:808]/')).toEqual({
        ok: true,
      });
      expect(validateBaseURL('http://[2002:808:808::1]/')).toEqual({
        ok: true,
      });
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

    it('allows the newly classified ranges too (escape hatch is global)', () => {
      expect(validateBaseURL('http://100.100.100.200/')).toEqual({ ok: true });
      expect(validateBaseURL('http://192.0.0.1/')).toEqual({ ok: true });
      expect(validateBaseURL('http://[::127.0.0.1]/')).toEqual({ ok: true });
      expect(validateBaseURL('http://[64:ff9b::a9fe:a9fe]/')).toEqual({
        ok: true,
      });
      expect(validateBaseURL('http://[2002:a9fe:a9fe::1]/')).toEqual({
        ok: true,
      });
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
