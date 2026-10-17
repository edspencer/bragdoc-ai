#!/usr/bin/env node
// `bragdoc [command] …`: the command-line entry point (the package's bin; `npm run bragdoc -- …` from a checkout).
// With no command it runs the server in the foreground (`serve`). This is PR1's minimal subset; PR5 brings the full
// command set (server/commands/, `service`, `--open`, the Node version check) in Hallway's shape.
import { UsageError, check, parseArgs } from './args.js';
import { DEFAULT_PORT, parsePort } from './port.js';
import { VERSION, resolveDataDir, tildify } from './paths.js';

const USAGE = `Usage: bragdoc [command] [options]

Commands
  serve                  (the default) Run BragDoc in the foreground: the web app and API on
                         http://localhost:${DEFAULT_PORT}.
    --port <n>           the port (default ${DEFAULT_PORT}, or $PORT). Never changed for you: if it's taken,
                         BragDoc says so and exits.
    --host <addr>        the address to bind (default 127.0.0.1). Anything but loopback is refused
                         unless BRAGDOC_DANGEROUSLY_ALLOW_OPEN=1.
    --data-dir <dir>     the data home (default $BRAGDOC_HOME, else ~/.bragdoc)
    --quiet, -q          print just the "BragDoc on <url>" line

  --version, -v          Print the version.
  --help, -h             Print this help.

Exit codes: 0 ok, 1 error, 2 usage error.`;

const LOOPBACK = new Set(['127.0.0.1', 'localhost', '::1', '[::1]']);

/** Resolves with an exit code when there's nothing to run, else undefined while the server runs. */
async function serve(flags: Record<string, string>): Promise<number | undefined> {
  const given = flags.port ?? process.env.PORT;
  const port = given === undefined || given === '' ? DEFAULT_PORT : parsePort(given);
  if (port === null) throw new UsageError(`${flags.port !== undefined ? '--port' : 'PORT'} must be a port number (0-65535), not '${given}'`);
  const hostname = flags.host ?? '127.0.0.1';
  // A minimal stand-in for Paddock's bind-safety guard, which PR2 brings as server/bind-safety.ts (D10, D21).
  if (!LOOPBACK.has(hostname) && process.env.BRAGDOC_DANGEROUSLY_ALLOW_OPEN !== '1')
    throw new Error(`refusing to listen on ${hostname}: BragDoc has no login, so anyone who can reach that address could read and change your data. Use 127.0.0.1, or set BRAGDOC_DANGEROUSLY_ALLOW_OPEN=1 if you really mean it (e.g. inside Docker).`);
  const dataDir = resolveDataDir(flags['data-dir']);
  const { startServer } = await import('./index.js');
  let bound: number;
  try {
    // `npm run dev` (BRAGDOC_DEV=1): Vite serves the web app; the server is the API only
    ({ port: bound } = await startServer(port, { hostname, dataDir, webDist: process.env.BRAGDOC_DEV ? null : undefined }));
  } catch (e) {
    const code = (e as NodeJS.ErrnoException).code;
    if (code === 'EADDRINUSE') throw new Error(`port ${port} is already in use (another BragDoc, or something else); pick another with --port <n>`);
    if (code === 'EACCES') throw new Error(`not allowed to listen on port ${port}; pick another with --port <n>`);
    throw e;
  }
  const { startupMessage } = await import('./banner.js');
  const shown = LOOPBACK.has(hostname) || hostname === '0.0.0.0' || hostname === '::' ? 'localhost' : hostname;
  process.stdout.write(startupMessage({ version: VERSION, url: `http://${shown}:${bound}`, home: tildify(dataDir), quiet: !!flags.quiet }));
  if (!LOOPBACK.has(hostname)) process.stderr.write(`bragdoc: listening on ${hostname}, not just this computer (BRAGDOC_DANGEROUSLY_ALLOW_OPEN=1).\n`);
  return undefined;
}

/** Resolves with the exit code, or undefined while the server runs. */
async function main(argv: string[]): Promise<number | undefined> {
  const { pos, flags, rest } = parseArgs(argv);
  if (flags.help) {
    process.stdout.write(USAGE + '\n');
    return 0;
  }
  if (flags.version) {
    process.stdout.write(VERSION + '\n');
    return 0;
  }
  const [cmd = 'serve', ...args] = pos;
  switch (cmd) {
    case 'serve':
      check(cmd, flags, ['port', 'host', 'data-dir', 'quiet'], args, 0, rest);
      return serve(flags);
    default:
      throw new UsageError(`unknown command '${cmd}'`);
  }
}

// `bragdoc --help | head`: the reader has gone, so there's nothing left to cut off. Stop quietly rather than with a
// stack trace.
for (const stream of [process.stdout, process.stderr])
  stream.on('error', (e: NodeJS.ErrnoException) => {
    if (e.code !== 'EPIPE') throw e;
    process.exit(process.exitCode ?? 0);
  });

// exitCode, not exit(): exiting could cut off output still being written to a pipe
main(process.argv.slice(2)).then(
  (code) => {
    if (code !== undefined) process.exitCode = code;
  },
  (e) => {
    process.stderr.write(`bragdoc: ${(e as Error).message}\n`);
    if (e instanceof UsageError) process.stderr.write(`\n${USAGE}\n`);
    process.exitCode = e instanceof UsageError ? 2 : 1;
  },
);
