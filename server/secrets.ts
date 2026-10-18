// secrets.yaml (SPEC R2): the one place a secret is kept, mode 0600, out of config.yaml and out of backups and the
// data home's git repository (home.ts GITIGNORED, store/backups.ts). It keeps a GitHub personal access token, when
// you connect GitHub with a token rather than the gh CLI, and (v0.2) each cloud AI connection's key, by connection id:
//
//   github:
//     token: github_pat_…
//   ai:
//     openrouter:
//       apiKey: sk-or-…
//
// A key is never returned by the API: only whether there is one, and its last four characters (aiKeyHint).
// It's machine-written (Settings → Sources), so it goes through atomic.ts like runtime.json (D27), not the store. Keys
// this build doesn't know are kept. A file that doesn't parse is never overwritten: saving a token then fails with a
// message saying so, and reading one finds none.
import fs from 'node:fs';
import YAML from 'yaml';
import { keyOwner, type AiConnectionConfig } from '../shared/ai/connections.js';
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
    this.write(doc);
  }

  /**
   * An AI connection's key, or null. Pass the connections to follow a `jev` connection to its `via`'s key (it has none
   * of its own: SPEC R25). Throws SecretsError when secrets.yaml can't be read, so a call can say why it has no key.
   */
  aiKey(id: string, connections?: Record<string, AiConnectionConfig>): string | null {
    const owner = connections ? keyOwner(id, connections) : id;
    const k = (((this.read().ai as Record<string, unknown> | undefined)?.[owner]) as Record<string, unknown> | undefined)?.apiKey;
    return typeof k === 'string' && k.trim() ? k.trim() : null;
  }

  /** Whether there's a key, and its last four characters (`…abcd`), for the API and the UI. Never the key. */
  aiKeyHint(id: string, connections?: Record<string, AiConnectionConfig>): { hasKey: boolean; keyHint: string | null; error?: string } {
    let key: string | null;
    try {
      key = this.aiKey(id, connections);
    } catch (e) {
      return { hasKey: false, keyHint: null, error: (e as Error).message };
    }
    // a short key would give too much of itself away in four characters
    return { hasKey: !!key, keyHint: key && key.length >= 16 ? `…${key.slice(-4)}` : key ? '…' : null };
  }

  /** Save (or, with null, forget: removed from the file) an AI connection's key. */
  setAiKey(id: string, key: string | null): void {
    const doc = this.read();
    const ai = { ...((doc.ai as Record<string, unknown> | undefined) ?? {}) };
    const entry = { ...((ai[id] as Record<string, unknown> | undefined) ?? {}) };
    if (key === null) delete entry.apiKey;
    else entry.apiKey = key;
    if (Object.keys(entry).length) ai[id] = entry;
    else delete ai[id];
    if (Object.keys(ai).length) doc.ai = ai;
    else delete doc.ai;
    this.write(doc);
  }

  private write(doc: Record<string, unknown>): void {
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
