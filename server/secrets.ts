// secrets.yaml (SPEC R2): the one place a secret is kept, mode 0600, out of config.yaml and out of backups and the
// data home's git repository (home.ts GITIGNORED, store/backups.ts). v0.1 keeps one: a GitHub personal access token,
// when you connect GitHub with a token rather than the gh CLI.
//
//   github:
//     token: github_pat_…
//
// It's machine-written (Settings → Sources), so it goes through atomic.ts like runtime.json (D27), not the store. Keys
// this build doesn't know are kept. A file that doesn't parse is never overwritten: saving a token then fails with a
// message saying so, and reading one finds none.
import fs from 'node:fs';
import YAML from 'yaml';
import { atomicWrite } from './atomic.js';
import { homePaths } from './home.js';
import { tildify } from './paths.js';

/** secrets.yaml can't be read or written; nothing was changed. */
export class SecretsError extends Error {}

export class Secrets {
  readonly file: string;

  constructor(dataDir: string) {
    this.file = homePaths(dataDir).secrets;
  }

  /** The GitHub token, or null when there's none (or the file is unreadable). */
  githubToken(): string | null {
    try {
      const t = (this.read().github as Record<string, unknown> | undefined)?.token;
      return typeof t === 'string' && t.trim() ? t.trim() : null;
    } catch {
      return null;
    }
  }

  /** Save (or, with null, forget) the GitHub token. */
  setGithubToken(token: string | null): void {
    const doc = this.read();
    const github = { ...((doc.github as Record<string, unknown> | undefined) ?? {}) };
    if (token === null) delete github.token;
    else github.token = token;
    if (Object.keys(github).length) doc.github = github;
    else delete doc.github;
    if (!fs.existsSync(this.file) && !Object.keys(doc).length) return; // nothing to forget, nothing to write
    // 0600 whatever the umask, every time (atomicWrite chmods): it's a credential
    atomicWrite(this.file, `# Written by BragDoc. Secrets only: readable by you alone (mode 0600), never backed up.\n${YAML.stringify(doc)}`, { mode: 0o600 });
  }

  private read(): Record<string, unknown> {
    let text: string;
    try {
      text = fs.readFileSync(this.file, 'utf8');
    } catch (e) {
      if ((e as NodeJS.ErrnoException).code === 'ENOENT') return {};
      throw new SecretsError(`${tildify(this.file)} can't be read (${(e as NodeJS.ErrnoException).code ?? (e as Error).message})`);
    }
    let doc: unknown;
    try {
      doc = YAML.parse(text) ?? {};
    } catch (e) {
      throw new SecretsError(`${tildify(this.file)} isn't valid YAML (${(e as Error).message.split('\n')[0]}). Fix or remove it by hand; BragDoc won't overwrite it.`);
    }
    if (typeof doc !== 'object' || Array.isArray(doc)) throw new SecretsError(`${tildify(this.file)} should be a mapping (key: value). Fix or remove it by hand.`);
    return doc as Record<string, unknown>;
  }
}
