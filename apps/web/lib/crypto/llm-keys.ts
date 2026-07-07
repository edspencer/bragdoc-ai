/**
 * Encryption for user LLM API keys (BYOK).
 *
 * Uses WebCrypto (`crypto.subtle`) exclusively so the same code runs on
 * Cloudflare Workers (OpenNext) and Node 20+ dev/test environments.
 *
 * Scheme: AES-256-GCM with a random 12-byte IV per encryption. The AES key
 * is derived via HKDF-SHA256 from the `BYOK_ENCRYPTION_KEY` env secret.
 * A constant app-specific salt is acceptable here because HKDF's input is
 * already a high-entropy secret (generated with `openssl rand -base64 32`),
 * not a password.
 *
 * Decryption must only ever happen server-side; plaintext keys must never
 * appear in API responses, logs, or client components.
 */

const HKDF_SALT = new TextEncoder().encode('bragdoc-byok-salt-v1');
const HKDF_INFO = new TextEncoder().encode('bragdoc-llm-keys');
const IV_LENGTH_BYTES = 12;

// Cache the derived CryptoKey per secret value so we don't re-run HKDF on
// every encrypt/decrypt call.
let cachedKey: { secret: string; key: CryptoKey } | null = null;

function getSecret(): string {
  const secret = process.env.BYOK_ENCRYPTION_KEY;
  if (!secret) {
    throw new Error(
      'BYOK_ENCRYPTION_KEY environment variable is not set. ' +
        'Generate one with `openssl rand -base64 32` and add it to your environment.',
    );
  }
  return secret;
}

async function getEncryptionKey(): Promise<CryptoKey> {
  const secret = getSecret();

  if (cachedKey && cachedKey.secret === secret) {
    return cachedKey.key;
  }

  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    'HKDF',
    false,
    ['deriveKey'],
  );

  const key = await crypto.subtle.deriveKey(
    { name: 'HKDF', hash: 'SHA-256', salt: HKDF_SALT, info: HKDF_INFO },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt'],
  );

  cachedKey = { secret, key };
  return key;
}

function toBase64(bytes: ArrayBuffer | Uint8Array): string {
  return Buffer.from(bytes as Uint8Array).toString('base64');
}

function fromBase64(value: string): Uint8Array<ArrayBuffer> {
  const buffer = Buffer.from(value, 'base64');
  // Copy into a fresh ArrayBuffer-backed array so the result satisfies
  // WebCrypto's BufferSource type (Buffer may be SharedArrayBuffer-backed)
  const bytes = new Uint8Array(new ArrayBuffer(buffer.length));
  bytes.set(buffer);
  return bytes;
}

/**
 * Encrypt an LLM API key for storage.
 *
 * @returns base64-encoded ciphertext and IV (a fresh random IV per call)
 * @throws if BYOK_ENCRYPTION_KEY is unset
 */
export async function encryptApiKey(
  plaintext: string,
): Promise<{ encrypted: string; iv: string }> {
  const key = await getEncryptionKey();
  const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH_BYTES));

  const ciphertext = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    new TextEncoder().encode(plaintext),
  );

  return { encrypted: toBase64(ciphertext), iv: toBase64(iv) };
}

/**
 * Decrypt a stored LLM API key.
 *
 * @throws if BYOK_ENCRYPTION_KEY is unset, or if the ciphertext/IV are
 *   invalid or have been tampered with (AES-GCM authentication failure)
 */
export async function decryptApiKey(
  encrypted: string,
  iv: string,
): Promise<string> {
  const key = await getEncryptionKey();

  const plaintext = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: fromBase64(iv) },
    key,
    fromBase64(encrypted),
  );

  return new TextDecoder().decode(plaintext);
}
