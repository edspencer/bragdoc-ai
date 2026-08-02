/**
 * Validation for user-supplied LLM base URLs (BYOK `ollama` /
 * `openai_compatible` providers).
 *
 * Guards against SSRF: the PUT /api/user/llm-config route runs a live
 * verification probe against the configured base URL. Without this check an
 * authenticated user could point the probe at internal HTTP services (cloud
 * metadata endpoints such as 169.254.169.254, loopback services, LAN hosts).
 *
 * Private/internal addresses are rejected by default but allowed when
 * `BYOK_ALLOW_PRIVATE_BASEURLS=true` — the escape hatch for self-hosted
 * deployments where a private Ollama URL (http://192.168.x.x:11434,
 * http://localhost:11434) is the primary use case. Every classification
 * below is subject to that escape hatch.
 *
 * This module is also re-applied to every redirect hop by the probe's
 * SSRF-safe fetch (`lib/llm/safe-fetch.ts`), so a public endpoint cannot
 * bounce the probe to an internal one with a 3xx + `Location`.
 *
 * ## What is classified as private/internal
 *
 * Hostnames: `localhost`, `*.localhost`, `*.local`, `*.internal`.
 *
 * IPv4 literals — note the WHATWG `URL` parser normalizes hex/octal/integer
 * forms (`0x7f000001`, `0177.0.0.1`, `2130706433`) to dotted quads before we
 * see them:
 *   - `0.0.0.0`        unspecified
 *   - `10.0.0.0/8`     RFC 1918 private
 *   - `100.64.0.0/10`  RFC 6598 CGNAT (holds Alibaba's 100.100.100.200)
 *   - `127.0.0.0/8`    loopback
 *   - `169.254.0.0/16` link-local (AWS/GCP/Azure metadata 169.254.169.254)
 *   - `172.16.0.0/12`  RFC 1918 private
 *   - `192.0.0.0/24`   IETF protocol assignments
 *   - `192.168.0.0/16` RFC 1918 private
 *
 * IPv6 literals, after full expansion (so compressed `::` and embedded-IPv4
 * spellings are normalized first):
 *   - `::`               unspecified
 *   - `::1`              loopback
 *   - `fc00::/7`         unique-local
 *   - `fe80::/10`        link-local
 *   - `::ffff:a.b.c.d`   IPv4-mapped, when the embedded IPv4 is private
 *   - `::a.b.c.d`        IPv4-compatible (deprecated), ditto — this is the
 *                        `[::127.0.0.1]` / `[::7f00:1]` spelling
 *   - `64:ff9b::/96`     NAT64/DNS64, ditto — `[64:ff9b::a9fe:a9fe]` reaches
 *                        169.254.169.254 through a NAT64 gateway
 *   - `2002::/16`        6to4, when the IPv4 in hextets 1-2 is private
 * Malformed IPv6 literals fail closed (treated as private).
 *
 * ## Known residual risks (deliberately NOT covered here)
 *
 *   - Public DNS names that RESOLVE to private IPs — plain A records
 *     pointing at 10.x, and DNS rebinding. Only literal hosts are classified;
 *     there is no resolve-then-check step, and even one would not bind the
 *     checked address to the one the HTTP client eventually connects to.
 *   - Reserved-but-not-private IPv4 space: `192.0.2.0/24`, `198.51.100.0/24`,
 *     `203.0.113.0/24` (TEST-NET), `198.18.0.0/15` (benchmarking),
 *     `224.0.0.0/4` (multicast), `240.0.0.0/4` (reserved). None of these
 *     front internal services on our deploy targets.
 *   - IPv6 transition mechanisms other than NAT64 and 6to4 (e.g. Teredo,
 *     `2001::/32`).
 */

export type BaseURLValidationResult =
  | { ok: true }
  | { ok: false; reason: string };

type IPv4Octets = [number, number, number, number];

/** Parse a dotted-quad IPv4 literal into its four octets, or null. */
function parseIPv4(hostname: string): IPv4Octets | null {
  if (!/^\d{1,3}(\.\d{1,3}){3}$/.test(hostname)) return null;
  const octets = hostname.split('.').map(Number);
  if (octets.some((octet) => octet > 255)) return null;
  return octets as IPv4Octets;
}

/**
 * Loopback, RFC 1918 private, CGNAT, link-local/metadata, IETF protocol
 * assignments, or unspecified IPv4. See the module docblock for the full
 * list (and for the ranges deliberately left out).
 */
function isPrivateIPv4(octets: IPv4Octets): boolean {
  const [a, b, c] = octets;
  return (
    a === 127 || // 127.0.0.0/8 loopback
    a === 10 || // 10.0.0.0/8 private
    (a === 172 && b >= 16 && b <= 31) || // 172.16.0.0/12 private
    (a === 192 && b === 168) || // 192.168.0.0/16 private
    (a === 169 && b === 254) || // 169.254.0.0/16 link-local / cloud metadata
    (a === 100 && b >= 64 && b <= 127) || // 100.64.0.0/10 RFC 6598 CGNAT
    (a === 192 && b === 0 && c === 0) || // 192.0.0.0/24 IETF assignments
    octets.every((octet) => octet === 0) // 0.0.0.0 unspecified
  );
}

/**
 * Expand an IPv6 literal (without brackets) into 8 hextets.
 * Handles `::` compression and a trailing embedded IPv4 (`::ffff:10.0.0.1`).
 * Returns null if the literal is malformed.
 */
function expandIPv6(literal: string): number[] | null {
  let address = literal;

  // Convert a trailing embedded IPv4 into two hextets
  const lastColon = address.lastIndexOf(':');
  const tail = address.slice(lastColon + 1);
  const embedded = parseIPv4(tail);
  if (embedded) {
    const [a, b, c, d] = embedded;
    const high = ((a << 8) | b).toString(16);
    const low = ((c << 8) | d).toString(16);
    address = `${address.slice(0, lastColon + 1)}${high}:${low}`;
  }

  const parts = address.split('::');
  if (parts.length > 2) return null;

  const toHextets = (segment: string): number[] | null => {
    if (segment === '') return [];
    const groups = segment.split(':');
    const hextets: number[] = [];
    for (const group of groups) {
      if (!/^[0-9a-fA-F]{1,4}$/.test(group)) return null;
      hextets.push(Number.parseInt(group, 16));
    }
    return hextets;
  };

  const head = toHextets(parts[0] ?? '');
  const rest = parts.length === 2 ? toHextets(parts[1] ?? '') : [];
  if (!head || !rest) return null;

  if (parts.length === 1) {
    return head.length === 8 ? head : null;
  }
  const missing = 8 - head.length - rest.length;
  if (missing < 0) return null;
  return [...head, ...Array(missing).fill(0), ...rest];
}

/** Split two hextets back into the IPv4 address they encode. */
function embeddedIPv4(high: number, low: number): IPv4Octets {
  return [high >> 8, high & 0xff, low >> 8, low & 0xff];
}

/**
 * Loopback (::1), unspecified (::), unique-local (fc00::/7), link-local
 * (fe80::/10), or one of the IPv4-carrying forms (IPv4-mapped,
 * IPv4-compatible, NAT64, 6to4) wrapping a private IPv4.
 *
 * See the module docblock for the exact list.
 */
function isPrivateIPv6(literal: string): boolean {
  const hextets = expandIPv6(literal);
  // Treat malformed IPv6 literals as private: fail closed
  if (!hextets) return true;

  const at = (index: number): number => hextets[index] ?? 0;

  if ((at(0) & 0xfe00) === 0xfc00) return true; // fc00::/7 unique-local
  if ((at(0) & 0xffc0) === 0xfe80) return true; // fe80::/10 link-local

  // IPv4-mapped (::ffff:a.b.c.d) — classify the embedded IPv4
  if (hextets.slice(0, 5).every((h) => h === 0) && at(5) === 0xffff) {
    return isPrivateIPv4(embeddedIPv4(at(6), at(7)));
  }

  if (hextets.slice(0, 6).every((h) => h === 0)) {
    if (at(6) === 0 && at(7) === 0) return true; // :: unspecified
    if (at(6) === 0 && at(7) === 1) return true; // ::1 loopback
    // IPv4-compatible (::a.b.c.d, deprecated) — e.g. ::127.0.0.1, which the
    // URL parser hands us as ::7f00:1. Classify the embedded IPv4.
    return isPrivateIPv4(embeddedIPv4(at(6), at(7)));
  }

  // NAT64/DNS64 well-known prefix 64:ff9b::/96 — [64:ff9b::a9fe:a9fe] reaches
  // 169.254.169.254 through a NAT64 gateway
  if (
    at(0) === 0x0064 &&
    at(1) === 0xff9b &&
    hextets.slice(2, 6).every((h) => h === 0)
  ) {
    return isPrivateIPv4(embeddedIPv4(at(6), at(7)));
  }

  // 6to4 (2002:a.b.c.d::/48) — same trick via a 6to4 relay
  if (at(0) === 0x2002) {
    return isPrivateIPv4(embeddedIPv4(at(1), at(2)));
  }

  return false;
}

/** Hostname (already lowercased, no trailing dot) that names internal space. */
function isInternalHostname(hostname: string): boolean {
  return (
    hostname === 'localhost' ||
    hostname.endsWith('.localhost') ||
    hostname.endsWith('.local') ||
    hostname.endsWith('.internal')
  );
}

/** True when the hostname is a private/internal address or name. */
function isPrivateOrInternalHost(rawHostname: string): boolean {
  // Strip brackets from IPv6 literals ([::1] -> ::1) and any trailing dot
  const hostname = rawHostname
    .toLowerCase()
    .replace(/^\[|\]$/g, '')
    .replace(/\.$/, '');

  if (hostname.includes(':')) return isPrivateIPv6(hostname);

  const ipv4 = parseIPv4(hostname);
  if (ipv4) return isPrivateIPv4(ipv4);

  return isInternalHostname(hostname);
}

/**
 * Validate a user-supplied LLM base URL before it is probed server-side.
 *
 * Private/internal targets are rejected unless
 * `BYOK_ALLOW_PRIVATE_BASEURLS=true` (self-hosted deployments).
 */
export function validateBaseURL(raw: string): BaseURLValidationResult {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return { ok: false, reason: 'Base URL must be a valid absolute URL' };
  }

  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    return { ok: false, reason: 'Base URL must use http or https' };
  }

  if (url.username || url.password) {
    return {
      ok: false,
      reason: 'Base URL must not contain embedded credentials',
    };
  }

  if (isPrivateOrInternalHost(url.hostname)) {
    if (process.env.BYOK_ALLOW_PRIVATE_BASEURLS === 'true') {
      return { ok: true };
    }
    return {
      ok: false,
      reason:
        'Base URL must be publicly reachable; private or internal addresses ' +
        '(localhost, LAN IPs, cloud metadata) are not allowed on hosted ' +
        'BragDoc. Self-hosted deployments can set ' +
        'BYOK_ALLOW_PRIVATE_BASEURLS=true to allow them.',
    };
  }

  return { ok: true };
}
