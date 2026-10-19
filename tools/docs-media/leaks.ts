// The capture rig's leak scan, on its own so the unit tests can check it (test/docs-media.test.ts) without a browser.
import { KIND_BASE_URL } from '../../shared/ai/connections.ts';
import { DEFAULT_PORT } from '../../server/port.ts';

/**
 * The ports a loopback address may show besides BragDoc's own: the local model runners' preset addresses (Ollama's
 * 11434, LM Studio's 1234, llama.cpp's 8080), which are everyone's defaults, not this machine's. The AI world's fake
 * model server answers on Ollama's.
 */
export const PRESET_PORTS: readonly string[] = [
  String(DEFAULT_PORT),
  ...Object.values(KIND_BASE_URL).flatMap((u) => (u && /^http:\/\/(?:127\.0\.0\.1|localhost):\d+/.test(u) ? [new URL(u).port] : [])),
];

/**
 * What the shots must never show: paths and hosts of the machine they were taken on, and anything that isn't the
 * example world. The repository is public, and so is every pixel pushed to it. Extra patterns (your own hostnames,
 * say) go in $BRAGDOC_LEAK_EXTRA, as regex alternatives; they're not written here because this file is public.
 */
export function leakPattern(port: string | null): RegExp {
  return new RegExp(
    [
      String.raw`/(?:tmp|data|var|private|Users|home|root)/`,
      String.raw`[A-Za-z]:\\`,
      // a loopback address with another port (a bare 127.0.0.1 says nothing about the machine: the network page lists
      // it as always allowed), other than BragDoc's own and the model runners' presets
      String.raw`127\.0\.0\.1:(?!(?:${PRESET_PORTS.join('|')})(?!\d))\d+`,
      String.raw`\b(?:10|192\.168|172\.(?:1[6-9]|2\d|3[01]))\.\d+\.\d+`,
      String.raw`localhost:(?!(?:${PRESET_PORTS.join('|')})(?!\d))\d+`,
      String.raw`[\w.+-]+@(?![\w-]+(?:\.[\w-]+)*\.example\b)[\w-]+\.[a-z]{2,}`,
      // the rig's own port, unless it is the default one (the example rig runs there, so the shots show 2724)
      ...(port && port !== String(DEFAULT_PORT) ? [`:${port}\\b`] : []),
      ...(process.env.BRAGDOC_LEAK_EXTRA ? [process.env.BRAGDOC_LEAK_EXTRA] : []),
    ].join('|'),
    'g',
  );
}
