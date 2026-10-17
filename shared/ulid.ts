// ULIDs: every id in the data home (SPEC R2). 26 Crockford base-32 characters, the first ten a millisecond timestamp,
// so ids sort by creation time and an achievement's folder (achievements/YYYY/MM/) comes from its id, never its date.
// Written here rather than taken from a package: it's twenty lines, and shared/ must run in the browser too.

const ALPHABET = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';

/** A ULID, upper case (what we write). Lower case is not accepted: one spelling per id keeps file names unique. */
export const ULID_RE = /^[0-7][0-9A-HJKMNP-TV-Z]{25}$/;

let lastTime = -1;
let lastRandom: number[] = [];

/**
 * A new ULID for `time` (default now). Monotonic within one millisecond (the random part is incremented), so ids made
 * in a burst still sort in the order they were made.
 */
export function ulid(time: number = Date.now()): string {
  let random: number[];
  if (time === lastTime) {
    random = [...lastRandom];
    for (let i = random.length - 1; i >= 0; i--) {
      if (random[i] < 31) {
        random[i]++;
        break;
      }
      random[i] = 0;
    }
  } else {
    const bytes = new Uint8Array(16);
    globalThis.crypto.getRandomValues(bytes);
    random = [...bytes].map((b) => b & 31);
  }
  lastTime = time;
  lastRandom = random;
  let t = '';
  for (let i = 0, n = time; i < 10; i++, n = Math.floor(n / 32)) t = ALPHABET[n % 32] + t;
  return t + random.map((r) => ALPHABET[r]).join('');
}

/** The millisecond timestamp a ULID was made at. */
export function ulidTime(id: string): number {
  let n = 0;
  for (const c of id.slice(0, 10)) n = n * 32 + ALPHABET.indexOf(c);
  return n;
}
