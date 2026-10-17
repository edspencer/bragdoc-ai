// `bragdoc mcp` (the stdio bridge to the running server's /mcp) and `bragdoc mcp install claude` (SPEC R11). Adapted
// from Hallway's server/commands/agents.ts (the bridge's entry); the installer is new.
//
// `install claude` runs `claude mcp add` through proc (the only way BragDoc runs a program, D9) at user scope, with
// the bearer token and `X-BragDoc-Client: claude-code` as headers; `--stdio` registers `bragdoc mcp` instead, which
// reads the token itself at every start (so rotating it never breaks that registration). `--print` writes nothing and
// runs nothing: it prints the configuration for Claude Code, Claude Desktop, Cursor and other clients.
import { UsageError, check } from '../args.js';
import { DEFAULT_CONFIG } from '../config.js';
import { Egress } from '../egress.js';
import { resolveDataDir, tildify } from '../paths.js';
import { transientInstall } from '../platform/spec.js';
import { DEFAULT_PORT, parsePort } from '../port.js';
import { ProcError } from '../proc.js';
import { readRuntime } from '../runtime.js';
import type { Ctx } from './context.js';

const MCP_USAGE = 'mcp takes no arguments (the stdio bridge), or: install claude [--stdio] [--print]';
export const NOT_RUNNING = "BragDoc isn't running: run `bragdoc` or `bragdoc service install`";
/** The name agents see BragDoc's tools under (`/bragdoc:log-this` in Claude Code). */
const SERVER_NAME = 'bragdoc';

export async function mcp(ctx: Ctx, pos: string[], flags: Record<string, string>, rest: string[] | undefined): Promise<number> {
  const [sub, ...args] = pos;
  if (sub === undefined) {
    check('mcp', flags, ['data-dir'], args, 0, rest);
    return bridge(ctx, flags);
  }
  if (sub !== 'install') throw new UsageError(`unknown mcp command '${sub}'; ${MCP_USAGE}`);
  check('mcp install', flags, ['stdio', 'print', 'port', 'data-dir'], args, 1, rest);
  if (args[0] !== 'claude')
    throw new UsageError(args[0] ? `BragDoc can only register itself with Claude Code ('claude'); for ${args[0]}, see \`bragdoc mcp install claude --print\`` : 'mcp install needs a client: claude');
  return install(ctx, flags);
}

function dataDirOf(ctx: Ctx, flags: Record<string, string>): { dataDir: string; chosen: boolean } {
  if (flags['data-dir'] === '') throw new UsageError('--data-dir needs a directory');
  const chosen = flags['data-dir'] || ctx.env.BRAGDOC_HOME || undefined;
  return { dataDir: resolveDataDir(chosen, {}, ctx.homedir), chosen: !!chosen };
}

/** `bragdoc mcp`: stdio in and out, forwarded to the running server, so it stays the one writer. */
async function bridge(ctx: Ctx, flags: Record<string, string>): Promise<number> {
  const { dataDir } = dataDirOf(ctx, flags);
  const rt = readRuntime(dataDir);
  if (!rt?.running) {
    // an MCP client shows a stdio server's stderr in its logs; exiting makes it report the server as failed
    ctx.err(`bragdoc mcp: ${NOT_RUNNING}, then reconnect.${rt ? '' : ` (No runtime.json in ${tildify(dataDir, ctx.homedir)}: it has never run with this data home.)`}\n`);
    return 1;
  }
  // loopback is always on the egress allow-list, so the defaults are all it needs; each request is in the network log
  const egress = new Egress({ dataDir, config: () => DEFAULT_CONFIG });
  const { runBridge } = await import('../mcp/bridge.js');
  await runBridge({
    base: () => `http://127.0.0.1:${readRuntime(dataDir)?.port ?? rt.port}`,
    token: () => readRuntime(dataDir)?.mcpToken ?? null,
    notRunning: `${NOT_RUNNING}, then reconnect`,
    fetch: (url, init) => egress.egressFetch({ purpose: 'mcp.bridge' }, url, init),
  });
  return 0;
}

/** Shell-quote an argument for display (copy-pasteable in sh/zsh). */
const q = (s: string) => (/^[\w@%+=:,./-]+$/.test(s) ? s : `'${s.replace(/'/g, `'\\''`)}'`);

/** The command an MCP client should run for the stdio bridge: this Node and this CLI, or npx when that's where we are. */
function stdioCommand(ctx: Ctx, dataDir: string, chosen: boolean): string[] {
  const dd = chosen ? ['--data-dir', dataDir] : [];
  if (transientInstall(ctx.packageRoot)) return ['npx', '-y', '@bragdoc/local', 'mcp', ...dd];
  if (ctx.cliScript.endsWith('.ts')) throw new Error('--stdio needs a build: run `npm run build`, then `node dist/server/cli.js mcp install claude --stdio`');
  return [ctx.node.path, ctx.cliScript, 'mcp', ...dd];
}

async function install(ctx: Ctx, flags: Record<string, string>): Promise<number> {
  const { dataDir, chosen } = dataDirOf(ctx, flags);
  const rt = readRuntime(dataDir);
  const port = flags.port !== undefined ? parsePort(flags.port) : (rt?.port ?? DEFAULT_PORT);
  if (port === null || port === 0) throw new UsageError(`--port must be a port number (1-65535), not '${flags.port}'`);
  const url = `http://127.0.0.1:${port}/mcp`;
  const token = rt?.mcpToken ?? null;
  const stdio = !!flags.stdio;
  const stdioCmd = (() => {
    try {
      return stdioCommand(ctx, dataDir, chosen);
    } catch (e) {
      if (stdio) throw e;
      return ['bragdoc', 'mcp', ...(chosen ? ['--data-dir', dataDir] : [])];
    }
  })();

  const httpArgs = (t: string) => ['mcp', 'add', '--transport', 'http', '--scope', 'user', SERVER_NAME, url, '--header', `Authorization: Bearer ${t}`, '--header', 'X-BragDoc-Client: claude-code'];
  const stdioArgs = ['mcp', 'add', '--scope', 'user', SERVER_NAME, '--', ...stdioCmd];

  if (flags.print) {
    ctx.out(printConfig({ url, token, stdioCmd, httpArgs, stdioArgs, dataDir: tildify(dataDir, ctx.homedir) }));
    return 0;
  }
  if (!stdio && !token) {
    ctx.err(
      `bragdoc mcp install: BragDoc hasn't run with ${tildify(dataDir, ctx.homedir)} yet, so it has no MCP token. Start it once (\`bragdoc\`, or \`bragdoc service install\`), then run this again. Or register the stdio bridge, which reads the token itself: \`bragdoc mcp install claude --stdio\`.\n`,
    );
    return 1;
  }
  const args = stdio ? stdioArgs : httpArgs(token!);
  const shown = ['claude', ...(stdio ? stdioArgs : httpArgs('<token>'))].map(q).join(' ');
  try {
    let r = await ctx.proc('claude', args, { env: ctx.env, timeoutMs: 60_000 });
    let replaced = false;
    if (r.code !== 0 && /already exists/i.test(r.stderr + r.stdout)) {
      // a registration from before (an old token, or the other transport): replace it, at the same scope
      const rm = await ctx.proc('claude', ['mcp', 'remove', '--scope', 'user', SERVER_NAME], { env: ctx.env, timeoutMs: 60_000 });
      if (rm.code === 0) {
        replaced = true;
        r = await ctx.proc('claude', args, { env: ctx.env, timeoutMs: 60_000 });
      }
    }
    if (r.code !== 0) {
      // its own words, minus the token, should it ever repeat our arguments back
      const said = (r.stderr || r.stdout).trim().replaceAll(token ?? '\u0000', '<token>');
      ctx.err(`bragdoc mcp install: \`claude mcp add\` failed (exit ${r.code}):\n${said}\n\nThe command was:\n  ${shown}\n`);
      return 1;
    }
    ctx.out(
      [
        `${replaced ? 'Replaced the' : 'Registered'} BragDoc MCP server with Claude Code (user scope)${stdio ? `, as the stdio bridge: ${stdioCmd.map(q).join(' ')}` : `: ${url}`}.`,
        stdio ? 'It reads the token from runtime.json each time it starts.' : 'If you rotate the token in Settings, run this again.',
        'In Claude Code, try: "note in my BragDoc that I …". Agents should read `bragdoc guide`.',
        '',
      ].join('\n'),
    );
    return 0;
  } catch (e) {
    if (e instanceof ProcError && e.code === 'not_found') {
      ctx.err(
        [
          "bragdoc mcp install: Claude Code's `claude` command isn't installed here (or isn't on PATH).",
          'Install Claude Code, or register BragDoc yourself with:',
          '',
          `  ${['claude', ...(stdio ? stdioArgs : httpArgs(token!))].map(q).join(' ')}`,
          '',
          'For other clients: `bragdoc mcp install claude --print`.',
          '',
        ].join('\n'),
      );
      return 1;
    }
    throw e;
  }
}

function printConfig({
  url,
  token,
  stdioCmd,
  httpArgs,
  stdioArgs,
  dataDir,
}: {
  url: string;
  token: string | null;
  stdioCmd: string[];
  httpArgs: (t: string) => string[];
  stdioArgs: string[];
  dataDir: string;
}): string {
  const t = token ?? '<token>';
  const json = (v: unknown) => JSON.stringify(v, null, 2);
  const [command, ...args] = stdioCmd;
  return [
    `BragDoc's MCP server: ${url} (Streamable HTTP), with the bearer token from ${dataDir}/runtime.json.`,
    token ? 'Treat the token like a password: it lets whoever has it write to your board.' : `No token yet: BragDoc hasn't run with ${dataDir}. Start it once and run this again, or use the stdio bridge.`,
    '',
    '# Claude Code (what `bragdoc mcp install claude` runs)',
    ['claude', ...httpArgs(t)].map(q).join(' '),
    '# or, as the stdio bridge (`--stdio`)',
    ['claude', ...stdioArgs].map(q).join(' '),
    '',
    '# Claude Desktop: claude_desktop_config.json (stdio)',
    json({ mcpServers: { [SERVER_NAME]: { command, args } } }),
    '',
    '# Cursor: ~/.cursor/mcp.json (HTTP)',
    json({ mcpServers: { [SERVER_NAME]: { url, headers: { Authorization: `Bearer ${t}`, 'X-BragDoc-Client': 'cursor' } } } }),
    '',
    '# Any other client: the stdio command above, or the URL with these headers',
    `Authorization: Bearer ${t}`,
    'X-BragDoc-Client: <your client\'s name>',
    '',
  ].join('\n');
}
