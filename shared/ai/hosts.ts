// Where a model call goes, decided by its host and never by the connection's kind (SPEC R17, R19): an "OpenAI-
// compatible" server typed in by hand is still the internet if its host is. Pure, so the server (egress, consent) and
// the web app (each connection card's class) agree.
//
// - this-computer: loopback (localhost, *.localhost, 127.0.0.0/8, ::1, and those as IPv4-mapped IPv6).
// - your-network: host.docker.internal, RFC 1918 (10/8, 172.16/12, 192.168/16), link-local (169.254/16, fe80::/10),
//   ULA (fc00::/7) and `.local` names.
// - internet: everything else, including a public name that happens to resolve to a private address: the host as
//   written is all we can vouch for, and the safe mistake is to ask for consent.
//
// The URL parser has already turned the odd spellings of an address (`http://2130706433`, `http://0x7f.1`) into
// dotted quads, so only those need reading here.

export type HostClass = 'this-computer' | 'your-network' | 'internet';

export const HOST_CLASSES: readonly HostClass[] = ['this-computer', 'your-network', 'internet'];

/** Words for each class, as the UI and the CLI say them. */
export const HOST_CLASS_LABEL: Record<HostClass, string> = {
  'this-computer': 'this computer',
  'your-network': 'your network',
  internet: 'internet',
};

function ipv4(host: string): number[] | null {
  const m = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/.exec(host);
  if (!m) return null;
  const parts = m.slice(1).map(Number);
  return parts.every((p) => p <= 255) ? parts : null;
}

function classOfIpv4([a, b]: number[]): HostClass {
  if (a === 127) return 'this-computer';
  if (a === 10 || (a === 172 && b! >= 16 && b! <= 31) || (a === 192 && b === 168) || (a === 169 && b === 254)) return 'your-network';
  return 'internet';
}

/** An IPv6 address's class (the URL parser gives it compressed and lower case, in brackets). */
function classOfIpv6(addr: string): HostClass {
  if (addr === '::1') return 'this-computer';
  // IPv4-mapped (::ffff:127.0.0.1, which the parser prints as ::ffff:7f00:1)
  const mapped = /^::ffff:([0-9a-f]{1,4}):([0-9a-f]{1,4})$/.exec(addr);
  if (mapped) {
    const hi = parseInt(mapped[1]!, 16);
    const lo = parseInt(mapped[2]!, 16);
    return classOfIpv4([hi >> 8, hi & 255, lo >> 8, lo & 255]);
  }
  const first = parseInt(addr.split(':')[0] || '0', 16);
  if ((first & 0xfe00) === 0xfc00) return 'your-network'; // fc00::/7, unique local
  if ((first & 0xffc0) === 0xfe80) return 'your-network'; // fe80::/10, link-local
  return 'internet';
}

/** The class of a hostname as URL.hostname gives it (lower case; IPv6 in brackets). */
export function hostnameClass(hostname: string): HostClass {
  const h = hostname.toLowerCase().replace(/\.$/, '');
  if (h.startsWith('[') && h.endsWith(']')) return classOfIpv6(h.slice(1, -1));
  const v4 = ipv4(h);
  if (v4) return classOfIpv4(v4);
  if (h === 'localhost' || h.endsWith('.localhost')) return 'this-computer';
  if (h === 'host.docker.internal' || h.endsWith('.local')) return 'your-network';
  return 'internet';
}

/** Where a request to `url` goes. A URL that doesn't parse is `internet`: never trusted as local. */
export function hostClass(url: string | URL): HostClass {
  try {
    return hostnameClass(new URL(url).hostname);
  } catch {
    return 'internet';
  }
}

/** This computer or your network: no consent needed, and plain http is allowed (SPEC R19). */
export const isLocalClass = (c: HostClass): boolean => c !== 'internet';
