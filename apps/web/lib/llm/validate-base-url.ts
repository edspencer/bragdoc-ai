/**
 * Validation for user-supplied LLM base URLs (BYOK `ollama` /
 * `openai_compatible` providers).
 *
 * Guards against SSRF: the PUT /api/user/llm-config route runs a live
 * verification probe against the configured base URL, and echoes the
 * provider's error message back to the caller. Without this check an
 * authenticated user could point the probe at internal HTTP services
 * (cloud metadata endpoints such as 169.254.169.254, loopback services,
 * LAN hosts) and read parts of their responses.
 *
 * Private/internal addresses are rejected by default but allowed when
 * `BYOK_ALLOW_PRIVATE_BASEURLS=true` — the escape hatch for self-hosted
 * deployments where a private Ollama URL (http://192.168.x.x:11434,
 * http://localhost:11434) is the primary use case.
 *
 * Note: public DNS names that RESOLVE to private IPs (DNS rebinding and
 * friends) are a known residual risk that is out of scope for this layer;
 * only literal hostnames/IPs are classified here.
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

/** Loopback, RFC1918 private, link-local/metadata, or unspecified IPv4. */
function isPrivateIPv4(octets: IPv4Octets): boolean {
  const [a, b] = octets;
  return (
    a === 127 || // 127.0.0.0/8 loopback
    a === 10 || // 10.0.0.0/8 private
    (a === 172 && b >= 16 && b <= 31) || // 172.16.0.0/12 private
    (a === 192 && b === 168) || // 192.168.0.0/16 private
    (a === 169 && b === 254) || // 169.254.0.0/16 link-local / cloud metadata
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

/**
 * Loopback (::1), unspecified (::), unique-local (fc00::/7), link-local
 * (fe80::/10), or an IPv4-mapped/compatible form of a private IPv4.
 */
function isPrivateIPv6(literal: string): boolean {
  const hextets = expandIPv6(literal);
  // Treat malformed IPv6 literals as private: fail closed
  if (!hextets) return true;

  const at = (index: number): number => hextets[index] ?? 0;

  const allZeroThroughSix = hextets.slice(0, 6).every((h) => h === 0);
  if (allZeroThroughSix) {
    if (at(6) === 0 && at(7) === 0) return true; // :: unspecified
    if (at(6) === 0 && at(7) === 1) return true; // ::1 loopback
  }

  if ((at(0) & 0xfe00) === 0xfc00) return true; // fc00::/7 unique-local
  if ((at(0) & 0xffc0) === 0xfe80) return true; // fe80::/10 link-local

  // IPv4-mapped (::ffff:a.b.c.d) — classify the embedded IPv4
  if (hextets.slice(0, 5).every((h) => h === 0) && at(5) === 0xffff) {
    return isPrivateIPv4([at(6) >> 8, at(6) & 0xff, at(7) >> 8, at(7) & 0xff]);
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
