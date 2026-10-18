// The capture rig's leak scan, on its own so the unit tests can check it (test/docs-media.test.ts) without a browser.
import { DEFAULT_PORT } from '../../server/port.ts';

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
      // it as always allowed)
      String.raw`127\.0\.0\.1:(?!${DEFAULT_PORT}\b)\d+`,
      String.raw`\b(?:10|192\.168|172\.(?:1[6-9]|2\d|3[01]))\.\d+\.\d+`,
      String.raw`localhost:(?!${DEFAULT_PORT}\b)\d+`,
      String.raw`[\w.+-]+@(?![\w-]+(?:\.[\w-]+)*\.example\b)[\w-]+\.[a-z]{2,}`,
      // the rig's own port, unless it is the default one (the example rig runs there, so the shots show 2724)
      ...(port && port !== String(DEFAULT_PORT) ? [`:${port}\\b`] : []),
      ...(process.env.BRAGDOC_LEAK_EXTRA ? [process.env.BRAGDOC_LEAK_EXTRA] : []),
    ].join('|'),
    'g',
  );
}
