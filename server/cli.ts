#!/usr/bin/env node
// `bragdoc [command] …`: the command-line entry point (the package's bin; `npm run bragdoc -- …` from a checkout).
// With no command it runs the server in the foreground (`serve`); every other command is in server/commands/ (Hallway's
// shape: one file per command, one line in commands/index.ts). SPEC R1 is the contract.
//
// Everything imported statically here must load on an old Node, so the version check below gets to say so: the server,
// Hono and the commands are imported lazily, after it.
import { LOOPBACK, UsageError, check, parseArgs, parseHost } from './args.js';
import { MIN_NODE, nodeTooOld } from './node-version.js';
import { DEFAULT_PORT, parsePort } from './port.js';
import { PACKAGE_ROOT, VERSION, resolveDataDir, tildify } from './paths.js';

const USAGE = `Usage: bragdoc [command] [options]

Commands
  serve                  (the default) Run BragDoc in the foreground: the web app and API on
                         http://localhost:${DEFAULT_PORT}.
    --port <n>           the port (default ${DEFAULT_PORT}, or $PORT). Never changed for you: if it's taken,
                         BragDoc says so and exits.
    --host <addr>        the address to bind (default 127.0.0.1). Anything but loopback is refused
                         unless BRAGDOC_DANGEROUSLY_ALLOW_OPEN=1.
    --data-dir <dir>     the data home (default $BRAGDOC_HOME, else ~/.bragdoc)
    --open               open it in your browser once it's listening
    --quiet, -q          print just the "BragDoc on <url>" line

  service install        Run BragDoc in the background as a login service (a LaunchAgent on macOS,
                         a systemd user unit on Linux): it starts when you log in, not when the
                         computer boots, and is restarted if it exits. Needs an installed bragdoc
                         (npm i -g @bragdoc/local), not npx.
    --port <n>           the port it serves on (default ${DEFAULT_PORT})
    --data-dir <dir>     its data home (default $BRAGDOC_HOME, else ~/.bragdoc)
    --dry-run            print the service definition it would write, and write nothing
  service status         Is it installed and running, and on which port.
  service start | stop | restart
                         Start it, stop it until the next login, or restart it.
  service logs           Follow its output.
  service uninstall      Stop it and remove the service. Your data stays.

  guide                  The guide for coding agents.

  --version, -v          Print the version.
  --help, -h             Print this help.

Exit codes: 0 ok, 1 error, 2 usage error.`;

/**
 * The bind guard, at ONE call site, so PR2's server/bind-safety.ts (adapted from Paddock) replaces this function's
 * body and nothing else (D21). BragDoc has no login, so a non-loopback address is refused unless
 * BRAGDOC_DANGEROUSLY_ALLOW_OPEN=1 (D10).
 */
function assertBindAllowed(hostname: string, env: NodeJS.ProcessEnv): void {
  if (!LOOPBACK.has(hostname) && env.BRAGDOC_DANGEROUSLY_ALLOW_OPEN !== '1')
    throw new Error(`refusing to listen on ${hostname}: BragDoc has no login, so anyone who can reach that address could read and change your data. Use 127.0.0.1, or set BRAGDOC_DANGEROUSLY_ALLOW_OPEN=1 if you really mean it (e.g. inside Docker).`);
}

/** Resolves with an exit code when there's nothing to run, else undefined while the server runs. */
async function serve(flags: Record<string, string>): Promise<number | undefined> {
  // an empty $PORT means "not set"; an empty --port is a mistake (`--port "$P"` with P unset), so it's refused
  const given = flags.port ?? (process.env.PORT || undefined);
  const port = given === undefined ? DEFAULT_PORT : parsePort(given);
  if (port === null) throw new UsageError(`${flags.port !== undefined ? '--port' : 'PORT'} must be a port number (0-65535), not '${given}'`);
  const hostname = parseHost(flags.host);
  if (flags['data-dir'] === '') throw new UsageError('--data-dir needs a directory');
  assertBindAllowed(hostname, process.env);
  const dataDir = resolveDataDir(flags['data-dir']);
  const { startServer } = await import('./index.js');
  let bound: number;
  let close: () => Promise<void>;
  try {
    // `npm run dev` (BRAGDOC_DEV=1): Vite serves the web app; the server is the API only
    ({ port: bound, close } = await startServer(port, { hostname, dataDir, webDist: process.env.BRAGDOC_DEV ? null : undefined }));
  } catch (e) {
    const code = (e as NodeJS.ErrnoException).code;
    // never another port (D6): a bookmark, the service and an agent's MCP registration all point at this one
    // who holds it is only asked on loopback, where 127.0.0.1 is the address that's taken
    if (code === 'EADDRINUSE' && !(LOOPBACK.has(hostname) || hostname === '0.0.0.0' || hostname === '::'))
      throw new Error(`port ${port} is already in use on ${hostname}; pick another with --port <n>`);
    if (code === 'EADDRINUSE') {
      const { probeHealth } = await import('./commands/ready.js');
      const who = await probeHealth(port);
      if (who.kind === 'bragdoc')
        throw new Error(
          `port ${port} is already in use by BragDoc ${who.version}, already running at http://localhost:${port} (as the service? \`bragdoc service status\`). To run another one, pick another port with --port <n>.`,
        );
      throw new Error(`port ${port} is already in use by something that isn't BragDoc; pick another with --port <n>`);
    }
    if (code === 'EACCES') throw new Error(`not allowed to listen on port ${port}; pick another with --port <n>`);
    throw e;
  }
  const [{ startupMessage }, { transientInstall }] = await Promise.all([import('./banner.js'), import('./platform/spec.js')]);
  const shown = LOOPBACK.has(hostname) || hostname === '0.0.0.0' || hostname === '::' ? 'localhost' : hostname.includes(':') ? `[${hostname}]` : hostname;
  const url = `http://${shown}:${bound}`;
  process.stdout.write(
    startupMessage(
      { version: VERSION, url, home: tildify(dataDir), transient: transientInstall(PACKAGE_ROOT)?.where ?? null, quiet: !!flags.quiet },
      { isTTY: process.stdout.isTTY, columns: process.stdout.columns, env: process.env },
    ),
  );
  // a clean exit 0 on SIGTERM (what launchd and systemd send at logout and on `service stop`), and on Ctrl-C. The
  // service is restarted after it all the same (KeepAlive <true/>, Restart=always: D23, Paddock #872). The unref'd
  // timer is a backstop for a handle that would keep the process alive after the server has closed.
  for (const sig of ['SIGTERM', 'SIGINT'] as const)
    process.once(sig, () => {
      setTimeout(() => process.exit(0), 5000).unref();
      void close().then(() => (process.exitCode = 0));
    });
  if (!LOOPBACK.has(hostname)) process.stderr.write(`bragdoc: listening on ${hostname}, not just this computer (BRAGDOC_DANGEROUSLY_ALLOW_OPEN=1).\n`);
  if (flags.open) {
    const [{ openCommand }, { launch }] = await Promise.all([import('./platform/index.js'), import('./platform/runner.js')]);
    const cmd = openCommand(process.platform, url);
    if (!cmd || !(await launch(...cmd))) process.stderr.write(`bragdoc: couldn't open a browser here; open ${url} yourself.\n`);
  }
  return undefined;
}

/** Resolves with the exit code, or undefined while the server (or `service logs`) runs. */
async function main(argv: string[]): Promise<number | undefined> {
  if (nodeTooOld(process.versions.node))
    throw new Error(`BragDoc needs Node ${MIN_NODE} or newer, and this is Node ${process.versions.node}. Install a newer Node (https://nodejs.org) and run it again.`);
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
  if (cmd === 'serve') {
    check(cmd, flags, ['port', 'host', 'data-dir', 'open', 'quiet'], args, 0, rest);
    return serve(flags);
  }
  const { COMMANDS, makeCtx } = await import('./commands/index.js');
  const run = COMMANDS[cmd];
  if (!run) throw new UsageError(`unknown command '${cmd}'`);
  return run(makeCtx(), args, flags, rest);
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
