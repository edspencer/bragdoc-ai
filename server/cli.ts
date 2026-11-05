#!/usr/bin/env node
// `bragdoc [command] …`: the command-line entry point (the package's bin; `npm run bragdoc -- …` from a checkout).
// With no command it runs the server in the foreground (`serve`); every other command is in server/commands/ (Hallway's
// shape: one file per command, one line in commands/index.ts). SPEC R1 is the contract.
//
// Everything imported statically here must load on an old Node, so the version check below gets to say so: the server,
// Hono and the commands are imported lazily, after it.
import { ExitError, LOOPBACK, UsageError, check, parseArgs, parseHost } from './args.js';
import { evaluateBindSafety } from './bind-safety.js';
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
    --quiet, -q          print just the first line, "BragDoc <version>: <url>"

  service install        Run BragDoc in the background as a login service (a LaunchAgent on macOS,
                         a systemd user unit on Linux): it starts when you log in, not when the
                         computer boots, and is restarted if it exits. Needs an installed bragdoc
                         (npm i -g @bragdoc/local), not npx.
    --port <n>           the port it serves on (default ${DEFAULT_PORT})
    --data-dir <dir>     its data home (default $BRAGDOC_HOME, else ~/.bragdoc)
    --dry-run            print the service definition it would write, and write nothing
    --refresh            re-write the installed service for this BragDoc, keeping its port and data
                         home (what \`bragdoc update\` runs); exits 4 if there's none
  service status         Is it installed and running, which version, and on which port. Exits 0
                         when it's answering, 3 when it isn't running, 4 when it isn't installed.
    --json               the same as one JSON document on stdout
  service start | stop | restart
                         Start it, stop it until the next login, or restart it. Stopping doesn't
                         disable it: it starts again at your next login. stop and restart refuse
                         (exit 75) while BragDoc is busy: an import, a judge run, AI requests.
                         restart re-writes the service first if its Node or BragDoc has gone.
    --force              stop or restart all the same
  service logs           The last 50 lines of its log (<data home>/service/bragdoc.log).
    -f, --follow         keep printing what it writes, until Ctrl-C
    -n, --lines <n>      how many lines (default 50)
  service uninstall      Stop it and remove the service. Your data stays.

  update                 Update BragDoc to the latest version, from npm: checks it's safe, stops the
                         service, installs, starts it again and checks it answers, and puts the old
                         version back if it doesn't. Only asks npm when you run it (or doctor).
    --check              say whether there's a newer version, and change nothing
    --to <version|tag>   go to this version or dist-tag (next); the only way to an older one
    --yes                don't ask first (needed without a terminal)
    --force              go ahead while BragDoc is busy
    --json               one JSON document on stdout

  doctor                 Check this install: Node, how it was installed, the service, the port,
                         the data home, config.yaml, git, and whether there's a newer version. A fix
                         for each problem; exits 1 if there's one.
    --offline            don't ask npm about a newer version
    --json               the checks as one JSON document on stdout

  busy                   Is the running BragDoc in the middle of something a restart would cut
                         short? Exits 0 when it isn't, 75 when it is, 3 when nothing is running.
    --json               the answer as one JSON document on stdout
    --data-dir <dir>     the data home to find it by (default $BRAGDOC_HOME, else ~/.bragdoc)
    --port <n>           ask the BragDoc on this port instead

  mcp                    An MCP server on stdio, for coding agents: a bridge to the running BragDoc
                         (it reads runtime.json for the address and token).
    --data-dir <dir>     the data home to find it by (default $BRAGDOC_HOME, else ~/.bragdoc)
  mcp install claude     Register BragDoc's MCP server with Claude Code (user scope), with its token.
    --stdio              register the stdio bridge (\`bragdoc mcp\`) instead of the HTTP endpoint
    --print              print the configuration for Claude Code, Claude Desktop, Cursor and
                         others, and change nothing
    --port <n>           the port to register (default: the one BragDoc last ran on)
    --data-dir <dir>     the data home whose token to use

  import <export.json>   Bring an export from the hosted BragDoc app across: companies, projects
                         (with their repos), achievements, and documents as read-only files.
                         Importing the same file again adds nothing new.
    --dry-run            say what it would add, skip and leave behind, and why; write nothing
    --data-dir <dir>     the data home to import into (default $BRAGDOC_HOME, else ~/.bragdoc)

  guide                  The guide for coding agents (AGENT-GUIDE.md): how to log achievements.
    --snippet            just the paragraph for your agent's instruction file (CLAUDE.md, AGENTS.md)

  --version, -v          Print the version.
  --help, -h             Print this help.

Exit codes: 0 ok, 1 error, 2 usage error, 3 not running, 4 not installed (\`service\`), 5 can't update
itself (the command to run instead is printed), 6 the update failed and the old version is back, 7 the update
failed and couldn't be undone (what to run is printed), 75 busy.`;

/** Resolves with an exit code when there's nothing to run, else undefined while the server runs. */
async function serve(flags: Record<string, string>): Promise<number | undefined> {
  // an empty $PORT means "not set"; an empty --port is a mistake (`--port "$P"` with P unset), so it's refused
  const given = flags.port ?? (process.env.PORT || undefined);
  const port = given === undefined ? DEFAULT_PORT : parsePort(given);
  if (port === null) throw new UsageError(`${flags.port !== undefined ? '--port' : 'PORT'} must be a port number (0-65535), not '${given}'`);
  const hostname = parseHost(flags.host);
  if (flags['data-dir'] === '') throw new UsageError('--data-dir needs a directory');
  const bind = evaluateBindSafety(hostname); // D10
  if (bind.action === 'refuse') throw new Error(bind.message);
  const dataDir = resolveDataDir(flags['data-dir']);
  const { startServer } = await import('./index.js');
  let bound: number;
  let close: () => Promise<void>;
  try {
    // `npm run dev` (BRAGDOC_DEV=1): Vite serves the web app; the server is the API only
    ({ port: bound, close } = await startServer(port, { hostname, dataDir, webDist: process.env.BRAGDOC_DEV ? null : undefined }));
  } catch (e) {
    const { code, syscall, path: file } = e as NodeJS.ErrnoException;
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
    // EACCES from laying out the data home (say, a Docker volume owned by another uid) isn't about the port
    if (code === 'EACCES' && syscall === 'listen') throw new Error(`not allowed to listen on port ${port}; pick another with --port <n>`);
    if ((code === 'EACCES' || code === 'EPERM') && file) throw new Error(`can't write to ${file}: permission denied. The data home (${dataDir}) must belong to the user BragDoc runs as.`);
    throw e;
  }
  const [{ startupMessage }, { transientInstall }] = await Promise.all([import('./banner.js'), import('./platform/spec.js')]);
  const shown = LOOPBACK.has(hostname) || hostname === '0.0.0.0' || hostname === '::' ? 'localhost' : hostname.includes(':') ? `[${hostname}]` : hostname;
  const url = `http://${shown}:${bound}`;
  // a clean exit 0 on SIGTERM (what launchd and systemd send at logout and on `service stop`), and on Ctrl-C. The
  // service is restarted after it all the same (KeepAlive <true/>, Restart=always: D31, Paddock #872). The unref'd
  // timer is a backstop for a handle that would keep the process alive after the server has closed. Installed BEFORE
  // the banner: whoever waits for its first line may stop us the moment they see it, and until a handler exists a SIGTERM
  // kills outright.
  for (const sig of ['SIGTERM', 'SIGINT'] as const)
    process.once(sig, () => {
      setTimeout(() => process.exit(0), 5000).unref();
      void close().then(() => (process.exitCode = 0));
    });
  process.stdout.write(
    startupMessage(
      { version: VERSION, url, home: tildify(dataDir), transient: transientInstall(PACKAGE_ROOT)?.where ?? null, quiet: !!flags.quiet },
      { isTTY: process.stdout.isTTY, columns: process.stdout.columns, env: process.env },
    ),
  );
  if (bind.action === 'warn') process.stderr.write(`bragdoc: ${bind.message}\n`);
  if (flags.open) {
    const [{ openCommand }, { launch }] = await Promise.all([import('./platform/index.js'), import('./proc.js')]);
    const cmd = openCommand(process.platform, url);
    const opened = cmd ? await launch(...cmd).then(() => true, () => false) : false;
    if (!opened) process.stderr.write(`bragdoc: couldn't open a browser here; open ${url} yourself.\n`);
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
    process.exitCode = e instanceof UsageError ? 2 : e instanceof ExitError ? e.exitCode : 1;
  },
);
