// What `bragdoc serve` prints once it's listening. The "BragDoc on <url>" line is always printed and always first,
// with "Data home:" right after it: scripts and tests wait for it (e2e/, and smoke-pack from PR6). --quiet prints that
// line alone. PR5 adds Hallway's TTY-only banner art and the agent hint on top of this, keeping those two lines as
// they are.

export interface Startup {
  version: string;
  /** The server's address as people should open it: `http://localhost:2724`. */
  url: string;
  /** The data home, as people see it (`~/.bragdoc`). */
  home: string;
  quiet?: boolean;
}

export function startupMessage(o: Startup): string {
  const line = `BragDoc on ${o.url}`;
  if (o.quiet) return line + '\n';
  return [line, `Data home: ${o.home}`, `Version: ${o.version}`].join('\n') + '\n';
}
