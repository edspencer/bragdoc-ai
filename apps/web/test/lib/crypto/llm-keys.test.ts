import { decryptApiKey, encryptApiKey } from 'lib/crypto/llm-keys';

const TEST_SECRET = 'dGVzdC1zZWNyZXQtZm9yLWJ5b2stdW5pdC10ZXN0cw==';

describe('llm-keys crypto', () => {
  const originalSecret = process.env.BYOK_ENCRYPTION_KEY;

  beforeEach(() => {
    process.env.BYOK_ENCRYPTION_KEY = TEST_SECRET;
  });

  afterAll(() => {
    if (originalSecret === undefined) {
      delete process.env.BYOK_ENCRYPTION_KEY;
    } else {
      process.env.BYOK_ENCRYPTION_KEY = originalSecret;
    }
  });

  it('round-trips a plaintext API key', async () => {
    const plaintext = 'sk-test-1234567890abcdef';

    const { encrypted, iv } = await encryptApiKey(plaintext);

    expect(encrypted).not.toContain(plaintext);
    expect(typeof encrypted).toBe('string');
    expect(typeof iv).toBe('string');

    const decrypted = await decryptApiKey(encrypted, iv);
    expect(decrypted).toBe(plaintext);
  });

  it('round-trips unicode plaintext', async () => {
    const plaintext = 'clé-secrète-🔑';
    const { encrypted, iv } = await encryptApiKey(plaintext);
    expect(await decryptApiKey(encrypted, iv)).toBe(plaintext);
  });

  it('generates a unique IV (and ciphertext) per encryption', async () => {
    const plaintext = 'sk-test-same-plaintext';

    const first = await encryptApiKey(plaintext);
    const second = await encryptApiKey(plaintext);

    expect(first.iv).not.toBe(second.iv);
    expect(first.encrypted).not.toBe(second.encrypted);

    // IV is 12 bytes
    expect(Buffer.from(first.iv, 'base64')).toHaveLength(12);
  });

  it('rejects tampered ciphertext (GCM authentication)', async () => {
    const { encrypted, iv } = await encryptApiKey('sk-test-tamper-me');

    // Flip a byte in the ciphertext
    const bytes = Buffer.from(encrypted, 'base64');
    bytes[0] = bytes[0] ^ 0xff;
    const tampered = bytes.toString('base64');

    await expect(decryptApiKey(tampered, iv)).rejects.toThrow();
  });

  it('rejects decryption with the wrong IV', async () => {
    const { encrypted } = await encryptApiKey('sk-test-wrong-iv');
    const wrongIv = Buffer.from(new Uint8Array(12).fill(7)).toString('base64');

    await expect(decryptApiKey(encrypted, wrongIv)).rejects.toThrow();
  });

  it('throws a clear error when BYOK_ENCRYPTION_KEY is unset', async () => {
    delete process.env.BYOK_ENCRYPTION_KEY;

    await expect(encryptApiKey('sk-test')).rejects.toThrow(
      /BYOK_ENCRYPTION_KEY/,
    );
    await expect(decryptApiKey('abc', 'def')).rejects.toThrow(
      /BYOK_ENCRYPTION_KEY/,
    );
  });

  it('cannot decrypt with a different secret', async () => {
    const { encrypted, iv } = await encryptApiKey('sk-test-other-secret');

    process.env.BYOK_ENCRYPTION_KEY = 'YW5vdGhlci1zZWNyZXQtZW50aXJlbHk=';

    await expect(decryptApiKey(encrypted, iv)).rejects.toThrow();
  });
});
