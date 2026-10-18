// The screenshots source (SPEC R7, R8, D58): a folder you pick is watched for new screenshots, and the ones that are
// praise for you wait in Found. The zero-permission praise catcher: no Slack app, no admin, no AI. You screenshot it,
// BragDoc reads it on this computer (OCR, server/ocr/), and the screenshot rules (shared/rules/screenshot.ts) decide.
//
// - **Opt-in, new files only.** Nothing is watched until you choose a folder and switch it on, and only files that
//   arrive after that are read (chokidar `ignoreInitial`). Looking at what's already there is a separate, one-off
//   "look back over the last 7 days" that you ask for.
// - **Each file:** the name (screenshots only, unless you say every picture), the size (not over the evidence limit,
//   not an icon), the bytes (a picture, whatever its name says), then OCR, then the rules. A pass becomes a candidate
//   keyed `screenshot:<sha256>`, pointing at the file where it is (copied into evidence/ only when you keep it, D24);
//   anything else is counted and forgotten: its text is never stored (R7).
// - **Half-written files:** macOS writes a hidden `.Screenshot …` and renames it; other tools write in place. chokidar's
//   `awaitWriteFinish` waits until the size has stopped changing, so a file is read once, whole.
// - **One at a time.** Files queue here and are read one after another through the app's one OCR queue, which the
//   board's pasted pictures share: a burst of fifty screenshots can't pin the CPU or starve a paste.
// - **When the folder goes away** (deleted, unmounted, permission taken back), the card turns red with what happened,
//   the watcher is closed, and every HEALTH_MS the folder is looked at again: no crash loop, and it comes back by itself.
// - **macOS privacy (TCC):** Desktop, Documents and Downloads are protected. The first read asks for permission, and
//   the permission goes to whatever BragDoc runs in (Terminal, or node itself under the background service, which then
//   covers every node script). The card says so and suggests a folder of its own (RECOMMENDATIONS §9).
//
// The watcher's options are adapted from the store's (server/store/watch.ts, itself Local Review's events.ts), with
// awaitWriteFinish on: unlike the store's atomic renames, a screenshot tool writes its file over a moment.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { watch, type FSWatcher } from 'chokidar';
import type {
  ScreenshotsCounts,
  ScreenshotsError,
  ScreenshotsErrorCode,
  ScreenshotsFolderSuggestion,
  ScreenshotsSettingsRequest,
  ScreenshotsSourceStatus,
  ScreenshotsSuggestionsResponse,
} from '../../shared/api.js';
import { compileRules, describeMatch, type RulesProfile, type RulesResult } from '../../shared/rules/screenshot.js';
import { atomicWrite } from '../atomic.js';
import { ConfigWriteError, type ConfigStore } from '../config.js';
import type { EventBus } from '../events.js';
import { homePaths } from '../home.js';
import { type Ocr, sha256Of } from '../ocr/index.js';
import { tildify } from '../paths.js';
import { run } from '../proc.js';
import type { Services } from '../services/index.js';
import { MAX_BLOB_BYTES, imageSize, sniff } from '../store/blobs.js';
import type { Store } from '../store/index.js';
import { isTempName } from '../store/safefs.js';

/** How often a folder that went wrong is looked at again (and a watched one checked that it's still there). */
export const HEALTH_MS = 30_000;
/** chokidar's awaitWriteFinish: the size must hold still this long before a file is read. */
export const STABLE_MS = 1000;
/** At most this many files wait to be read; a bigger burst is passed over (and counted), not held in memory. */
export const MAX_QUEUE = 1000;
/** Smaller than this on either side is an icon or a sliver, not a screenshot worth reading. */
export const MIN_SIDE = 64;
/** The most days a look back may cover. */
export const MAX_LOOK_BACK_DAYS = 30;

/** File types a screenshot tool saves. OCR reads PNG, JPEG, GIF and WebP; the others are counted as unreadable. */
const PICTURE_EXT = /\.(?:png|jpe?g|gif|webp|heic|heif|tiff?|bmp)$/i;

/**
 * "Screenshot" in the languages macOS, Windows and the Linux desktops name them in, and the tools people use. Matched
 * case-insensitively anywhere in the name, after NFC (a decomposed "é" from the file system) and with any apostrophe.
 */
const SCREENSHOT_WORDS = [
  'screenshot', 'screen shot', 'bildschirmfoto', "capture d'écran", 'captura de pantalla', 'captura de tela', 'captura de ecrã',
  'schermata', 'istantanea', 'schermafbeelding', 'skärmavbild', 'skjermbilde', 'skærmbillede', 'näyttökuva', 'zrzut ekranu',
  'snímek obrazovky', 'snímka obrazovky', 'képernyőkép', 'ekran resmi', 'снимок экрана', 'знімок екрана', 'στιγμιότυπο οθόνης',
  'צילום מסך', 'لقطة شاشة', 'スクリーンショット', '截屏', '截图', '屏幕快照', '螢幕截圖', '스크린샷', 'ภาพหน้าจอ', 'tangkapan layar',
  'cleanshot', 'flameshot', 'shottr', 'spectacle', 'greenshot', 'snagit',
];

/**
 * A date then a time, as screenshot tools stamp them: macOS's "2026-10-17 at 9.41.03 PM" (with U+202F, the narrow
 * no-break space, before PM since macOS 14), GNOME's "2026-10-17 09-41-03", Spectacle's "20261017_094103", Flameshot's
 * "2026-10-17_09-41", Windows' "2026-10-17 094103". A few letters may sit between (a localized "at", "um", "à").
 */
const DATE_TIME = /(?:19|20)\d{2}-?(?:0[1-9]|1[0-2])-?(?:0[1-9]|[12]\d|3[01])[^\d]{1,14}?(?:[01]?\d|2[0-3])[.:\-_]?[0-5]\d(?:[.:\-_]?[0-5]\d)?(?!\d)/u;

/** Is this file name one a screenshot tool would give? Best effort for Linux and other tools; exact for macOS. */
export function looksLikeScreenshot(name: string): boolean {
  const n = name.normalize('NFC').toLowerCase().replace(/[‘’ʼ`´]/g, "'");
  return SCREENSHOT_WORDS.some((w) => n.includes(w)) || DATE_TIME.test(n);
}

// ---------------------------------------------------------------- folders

/** `~/Screenshots` → the absolute path. Anything else must already be absolute. */
export function expandFolder(folder: string, homedir: string): string | null {
  const f = folder.trim();
  if (f === '~') return homedir;
  if (f.startsWith('~/')) return path.join(homedir, f.slice(2));
  return path.isAbsolute(f) ? path.normalize(f) : null;
}

/** macOS protects these: reading one asks for permission (TCC). */
const PROTECTED = ['Desktop', 'Documents', 'Downloads'];

function isProtected(abs: string, homedir: string, platform: string): boolean {
  return platform === 'darwin' && PROTECTED.some((d) => abs === path.join(homedir, d) || abs.startsWith(path.join(homedir, d) + path.sep));
}

export class ScreenshotsSourceError extends Error {
  constructor(
    readonly code: ScreenshotsErrorCode | 'config_invalid',
    message: string,
  ) {
    super(message);
    this.name = 'ScreenshotsSourceError';
  }

  toJSON(): ScreenshotsError {
    return { code: this.code as ScreenshotsErrorCode, message: this.message };
  }
}

const fail = (code: ScreenshotsSourceError['code'], message: string) => new ScreenshotsSourceError(code, message);

/** The plain-words reason a folder can't be read, for an fs error code. */
function folderError(e: unknown, shown: string, platform: string, homedir: string, abs: string): ScreenshotsSourceError {
  const code = (e as NodeJS.ErrnoException).code;
  if (code === 'ENOENT') return fail('missing', `There’s no folder at ${shown}. Was it moved or deleted? Make it again, or choose another.`);
  if (code === 'ENOTDIR') return fail('not_a_folder', `${shown} is a file, not a folder.`);
  if (code === 'EACCES' || code === 'EPERM')
    return fail(
      'denied',
      platform === 'darwin'
        ? `macOS didn’t let BragDoc read ${shown}.${isProtected(abs, homedir, platform) ? ' Desktop, Documents and Downloads are protected:' : ''} allow the app BragDoc runs in (Terminal, or node for the background service) in System Settings → Privacy & Security → Files and Folders, or choose a folder of its own.`
        : `BragDoc isn’t allowed to read ${shown} (permission denied). Check the folder’s permissions, or choose another.`,
    );
  return fail('failed', `BragDoc can’t read ${shown}: ${(e as Error).message}`);
}

// ---------------------------------------------------------------- state

interface State {
  counts: ScreenshotsCounts;
  lastMatch: ScreenshotsSourceStatus['lastMatch'];
  lastSeen: ScreenshotsSourceStatus['lastSeen'];
  lookBack: ScreenshotsSourceStatus['lookBack'];
}

const EMPTY_STATE = (): State => ({ counts: { looked: 0, sent: 0, ignored: 0, failed: 0 }, lastMatch: null, lastSeen: null, lookBack: null });

interface Job {
  file: string;
  /** Part of a look back (counted in its progress). */
  lookBack: boolean;
}

/** What became of one file. */
export type Outcome = { kind: 'sent'; candidateId: string } | { kind: 'ignored' | 'failed' | 'looked' | 'skipped'; why: string };

export interface ScreenshotsSourceOptions {
  dataDir: string;
  config: ConfigStore;
  store: Store;
  services: Services;
  bus: EventBus;
  ocr: Ocr;
  /** The environment `defaults` runs with (macOS). */
  env?: NodeJS.ProcessEnv;
  now?: () => Date;
  homedir?: string;
  platform?: NodeJS.Platform;
  /** How often a broken folder is looked at again (tests make it short). */
  healthMs?: number;
  /** awaitWriteFinish's quiet time (tests make it short). */
  stableMs?: number;
}

/** The calendar day of a time in a time zone (the profile's), else the machine's. */
function dayIn(d: Date, tz: string | undefined): string {
  const opts = { year: 'numeric', month: '2-digit', day: '2-digit' } as const;
  try {
    return new Intl.DateTimeFormat('en-CA', { ...opts, timeZone: tz }).format(d);
  } catch {
    return new Intl.DateTimeFormat('en-CA', opts).format(d);
  }
}

/** A quote as an achievement's title: its first sentence (the whole quote is on the sticky), cut at a word if long. */
export function titleOf(quote: string): string {
  const q = quote.replace(/\s+/g, ' ').trim();
  const first = /^.{20,}?[.!?](?=\s|$)/u.exec(q)?.[0] ?? q;
  if (first.length <= 110) return first;
  const cut = first.slice(0, 110);
  return `${cut.slice(0, Math.max(60, cut.lastIndexOf(' '))).trimEnd()}…`;
}

/** The card's "passed the rules" chips: one per match, but the chat cues (the window, not the message) as one. */
export function reasonsOf(r: RulesResult): string[] {
  const chat = r.matched.filter((m) => m.rule === 'chat').map((m) => m.text);
  const rest = r.matched.filter((m) => m.rule !== 'chat').map(describeMatch);
  return [...new Set([...rest, ...(chat.length ? [`Looks like a chat: ${chat.slice(0, 2).map((t) => `"${t}"`).join(', ')}`] : [])])];
}

export class ScreenshotsSource {
  private readonly file: string;
  private readonly now: () => Date;
  private readonly homedir: string;
  private readonly platform: NodeJS.Platform;
  private readonly healthMs: number;
  private readonly stableMs: number;
  private st: State;
  private watcher: FSWatcher | null = null;
  /** The folder the watcher is on (absolute). */
  private watching: string | null = null;
  private error: ScreenshotsSourceError | null = null;
  private queue: Job[] = [];
  private queuedFiles = new Set<string>();
  private reading: string | null = null;
  private draining: Promise<void> | null = null;
  private health: NodeJS.Timeout | null = null;
  private offConfig: (() => void) | null = null;
  private saveTimer: NodeJS.Timeout | null = null;
  /** Bumped when it's switched off or pointed elsewhere: a read that started before finishes without effect. */
  private generation = 0;
  private started = false;
  private rules: { key: string; fn: (text: string) => RulesResult } | null = null;

  constructor(private readonly o: ScreenshotsSourceOptions) {
    this.file = path.join(homePaths(o.dataDir).cache, 'sources', 'screenshots.json');
    this.now = o.now ?? (() => new Date());
    this.homedir = o.homedir ?? os.homedir();
    this.platform = o.platform ?? process.platform;
    this.healthMs = o.healthMs ?? HEALTH_MS;
    this.stableMs = o.stableMs ?? STABLE_MS;
    this.st = this.load();
  }

  private settings() {
    return this.o.config.get().sources.screenshots;
  }

  // ---- state (cache/sources/screenshots.json: derived, deletable)

  private load(): State {
    try {
      const j = JSON.parse(fs.readFileSync(this.file, 'utf8')) as Partial<State>;
      const e = EMPTY_STATE();
      return { ...e, ...j, counts: { ...e.counts, ...(j.counts ?? {}) }, lookBack: j.lookBack ? { ...j.lookBack, running: false } : null };
    } catch {
      return EMPTY_STATE();
    }
  }

  /** Save soon (a burst of files is one write), and tell open tabs. */
  private changed(): void {
    this.o.bus.emitSoon('sources:screenshots', { type: 'sources' }, 150, 1000);
    if (this.saveTimer) return;
    this.saveTimer = setTimeout(() => this.saveNow(), 500);
    this.saveTimer.unref?.();
  }

  private saveNow(): void {
    if (this.saveTimer) clearTimeout(this.saveTimer);
    this.saveTimer = null;
    try {
      atomicWrite(this.file, JSON.stringify(this.st, null, 2) + '\n', { mode: 0o600 });
    } catch (e) {
      process.stderr.write(`bragdoc: couldn't save the screenshots source's state: ${(e as Error).message}\n`);
    }
  }

  private shown(abs: string): string {
    return tildify(abs, this.homedir);
  }

  /** The card's view of it. */
  status(): ScreenshotsSourceStatus {
    const c = this.settings();
    const profile = this.o.store.profile();
    const notSet = c.enabled && !c.folder ? fail('not_set', 'Choose a folder to watch.') : null;
    const error = c.enabled ? (this.error ?? notSet) : null;
    return {
      enabled: c.enabled,
      folder: c.folder,
      onlyScreenshots: c.onlyScreenshots,
      state: !c.enabled ? 'off' : error ? 'error' : 'watching',
      error: error ? error.toJSON() : null,
      queued: this.queue.length,
      reading: this.reading,
      counts: { ...this.st.counts },
      lastMatch: this.st.lastMatch,
      lastSeen: this.st.lastSeen,
      lookBack: this.st.lookBack,
      needsProfile: !profile?.name?.trim(),
      platform: this.platform,
    };
  }

  // ---- choosing a folder

  /**
   * Check a folder can be watched: absolute (or `~/…`), a folder, readable, and not inside BragDoc's data folder or a
   * hidden folder (a kept screenshot couldn't be copied from there: store/blobs.ts checkIngestPath). The absolute path.
   */
  checkFolder(folder: string | null): string {
    if (!folder) throw fail('not_set', 'Choose a folder to watch.');
    const abs = expandFolder(folder, this.homedir);
    if (!abs) throw fail('invalid', `“${folder}” isn’t a full path. Start it with / or ~/.`);
    const shown = this.shown(abs);
    let real: string;
    try {
      real = fs.realpathSync(abs);
      if (!fs.statSync(real).isDirectory()) throw Object.assign(new Error('not a directory'), { code: 'ENOTDIR' });
      fs.readdirSync(real); // the read macOS asks permission for, and a directory we may not list
    } catch (e) {
      throw folderError(e, shown, this.platform, this.homedir, abs);
    }
    const home = (() => {
      try {
        return fs.realpathSync(this.o.dataDir);
      } catch {
        return path.resolve(this.o.dataDir);
      }
    })();
    if (real === home || real.startsWith(home + path.sep) || home.startsWith(real + path.sep))
      throw fail('not_allowed', `${shown} holds BragDoc’s own data folder. Choose a folder just for screenshots.`);
    if (real.split(path.sep).some((s) => s.startsWith('.'))) throw fail('not_allowed', `${shown} is a hidden folder. BragDoc doesn’t read hidden folders; choose another.`);
    return real;
  }

  /** Where screenshots probably go here, best first (`defaults read com.apple.screencapture location` on macOS). */
  async suggestions(): Promise<ScreenshotsSuggestionsResponse> {
    const out: ScreenshotsFolderSuggestion[] = [];
    const add = (abs: string, why: string) => {
      if (out.some((s) => expandFolder(s.folder, this.homedir) === abs)) return;
      let exists = false;
      try {
        exists = fs.statSync(abs).isDirectory();
      } catch {
        /* not there */
      }
      out.push({ folder: this.shown(abs), why, exists, protected: isProtected(abs, this.homedir, this.platform) });
    };
    if (this.platform === 'darwin') {
      let set: string | null = null;
      try {
        const r = await run('defaults', ['read', 'com.apple.screencapture', 'location'], { env: this.o.env ?? process.env, timeoutMs: 5000 });
        if (r.code === 0 && r.stdout.trim()) set = expandFolder(r.stdout.trim(), this.homedir);
      } catch {
        /* no `defaults`: the default location */
      }
      if (set) add(set, 'Where your Mac saves screenshots (you chose it)');
      else add(path.join(this.homedir, 'Desktop'), 'Where your Mac saves screenshots (the default)');
      add(path.join(this.homedir, 'Screenshots'), 'A folder of their own: no permission prompt');
    } else {
      const pictures = this.xdgPictures();
      add(path.join(pictures, 'Screenshots'), 'Where GNOME and KDE save screenshots');
      add(path.join(this.homedir, 'Screenshots'), 'A folder of their own');
      add(pictures, 'Your Pictures folder');
    }
    // the ones that exist first, in the order above
    return { platform: this.platform, suggestions: [...out.filter((s) => s.exists), ...out.filter((s) => !s.exists)] };
  }

  /** XDG_PICTURES_DIR from ~/.config/user-dirs.dirs, else ~/Pictures. */
  private xdgPictures(): string {
    const env = this.o.env ?? process.env;
    const cfg = env.XDG_CONFIG_HOME && path.isAbsolute(env.XDG_CONFIG_HOME) ? env.XDG_CONFIG_HOME : path.join(this.homedir, '.config');
    try {
      const m = /^XDG_PICTURES_DIR="?([^"\n]+)"?/m.exec(fs.readFileSync(path.join(cfg, 'user-dirs.dirs'), 'utf8'));
      const v = m?.[1]?.replace(/^\$HOME/, this.homedir);
      if (v && path.isAbsolute(v) && v !== this.homedir) return v;
    } catch {
      /* the default */
    }
    return path.join(this.homedir, 'Pictures');
  }

  /** Change the folder, switch it on or off, or the name filter. A folder is checked before anything is saved. */
  update(req: ScreenshotsSettingsRequest): ScreenshotsSourceStatus {
    const patch: Record<string, unknown> = {};
    if (req.enabled !== undefined) {
      if (typeof req.enabled !== 'boolean') throw fail('invalid', '`enabled` is true or false');
      patch.enabled = req.enabled;
    }
    if (req.onlyScreenshots !== undefined) {
      if (typeof req.onlyScreenshots !== 'boolean') throw fail('invalid', '`onlyScreenshots` is true or false');
      patch.onlyScreenshots = req.onlyScreenshots;
    }
    if (req.folder !== undefined) {
      if (typeof req.folder !== 'string' || !req.folder.trim() || req.folder.length > 4096) throw fail('invalid', '`folder` is a path, like ~/Screenshots');
      this.checkFolder(req.folder);
      // kept as you'd write it (a symlink stays a symlink), under your home folder as ~/…
      patch.folder = this.shown(expandFolder(req.folder, this.homedir)!);
    }
    const before = this.settings();
    const folder = (patch.folder as string | undefined) ?? before.folder;
    if (patch.enabled === true) this.checkFolder(folder);
    try {
      this.o.config.update({ sources: { screenshots: patch } });
    } catch (e) {
      if (e instanceof ConfigWriteError) throw fail('config_invalid', e.message);
      throw e;
    }
    this.reconcile();
    this.changed();
    return this.status();
  }

  // ---- watching

  /** Open or close the watcher to match the settings. Safe to call any time (a config change, the health check). */
  reconcile(): void {
    if (!this.started) return;
    const c = this.settings();
    const want = c.enabled && c.folder ? expandFolder(c.folder, this.homedir) : null;
    if (!want) {
      if (this.watcher || this.queue.length || this.error) this.stopWatching();
      this.error = null;
      return;
    }
    if (this.watcher && this.watching === want) {
      // still there? (chokidar doesn't always say when the watched folder itself goes)
      try {
        fs.readdirSync(want);
      } catch (e) {
        this.stopWatching();
        this.error = folderError(e, this.shown(want), this.platform, this.homedir, want);
        this.changed();
      }
      return;
    }
    if (this.watcher) this.stopWatching();
    let real: string;
    try {
      real = this.checkFolder(c.folder);
    } catch (e) {
      const before = this.error?.message;
      this.error = e instanceof ScreenshotsSourceError ? e : fail('failed', (e as Error).message);
      if (before !== this.error.message) this.changed();
      return;
    }
    this.error = null;
    this.watching = want;
    const gen = this.generation;
    const w = watch(real, {
      ignoreInitial: true,
      depth: 0,
      // hidden (macOS's `.Screenshot …` while it writes) and temp files: never read
      ignored: (p: string) => p !== real && (path.basename(p).startsWith('.') || isTempName(path.basename(p))),
      awaitWriteFinish: { stabilityThreshold: this.stableMs, pollInterval: Math.min(100, this.stableMs) },
    });
    w.on('add', (p) => {
      if (gen === this.generation) this.enqueue(p, false);
    })
      .on('unlinkDir', (p) => {
        if (path.resolve(p) === real && gen === this.generation) this.reconcile();
      })
      .on('error', (e) => {
        if (gen !== this.generation) return;
        this.stopWatching();
        this.error = folderError(e, this.shown(want), this.platform, this.homedir, want);
        this.changed();
      });
    this.watcher = w;
    this.changed();
  }

  private stopWatching(): void {
    this.generation++;
    const w = this.watcher;
    this.watcher = null;
    this.watching = null;
    if (w) void w.close().catch(() => {});
    // what was waiting is dropped: switched off means nothing more is read
    this.queue = [];
    this.queuedFiles.clear();
    if (this.st.lookBack?.running) this.st.lookBack = { ...this.st.lookBack, running: false };
    this.changed();
  }

  /** Start watching (if it's on), the health check, and following config.yaml. Returns a function that stops it all. */
  start(): () => void {
    this.started = true;
    this.offConfig = this.o.bus.subscribe((e) => {
      if (e.type === 'config') this.reconcile();
    });
    this.reconcile();
    this.health = setInterval(() => this.reconcile(), this.healthMs);
    this.health.unref?.();
    return () => this.stop();
  }

  /** Stop watching and checking: no handle is left open. */
  stop(): void {
    this.started = false;
    this.offConfig?.();
    this.offConfig = null;
    if (this.health) clearInterval(this.health);
    this.health = null;
    if (this.watcher) this.stopWatching();
    if (this.saveTimer) this.saveNow();
  }

  /** What's open right now (tests: switched off means none of these). */
  handles(): { watcher: boolean; health: boolean } {
    return { watcher: this.watcher !== null, health: this.health !== null };
  }

  /** Resolves when the queue is empty and nothing is being read (tests, shutdown). */
  async idle(): Promise<void> {
    while (this.draining) await this.draining;
  }

  // ---- the look back

  /** Read the pictures of the last `days` in the folder, once (oldest first). Returns the status. */
  lookBack(days = 7): ScreenshotsSourceStatus {
    if (!Number.isInteger(days) || days < 1 || days > MAX_LOOK_BACK_DAYS) throw fail('invalid', `How far back is a whole number of days, from 1 to ${MAX_LOOK_BACK_DAYS}.`);
    const c = this.settings();
    if (!c.enabled) throw fail('not_set', 'Turn the screenshots folder on first.');
    const real = this.checkFolder(c.folder);
    const since = this.now().getTime() - days * 86_400_000;
    let files: { p: string; t: number }[] = [];
    try {
      for (const name of fs.readdirSync(real)) {
        if (name.startsWith('.') || isTempName(name)) continue;
        const p = path.join(real, name);
        try {
          const s = fs.statSync(p);
          if (s.isFile() && s.mtimeMs >= since) files.push({ p, t: s.mtimeMs });
        } catch {
          /* gone already */
        }
      }
    } catch (e) {
      throw folderError(e, this.shown(real), this.platform, this.homedir, real);
    }
    files = files.sort((a, b) => a.t - b.t).slice(0, MAX_QUEUE);
    this.st.lookBack = { running: files.length > 0, days, total: files.length, done: 0, at: this.now().toISOString() };
    for (const f of files) this.enqueue(f.p, true);
    this.changed();
    return this.status();
  }

  // ---- reading

  private enqueue(file: string, lookBack: boolean): void {
    if (this.queuedFiles.has(file)) {
      if (lookBack) this.progress(); // already waiting: it counts as done for the look back's sake
      return;
    }
    if (this.queue.length >= MAX_QUEUE) {
      this.note(path.basename(file), 'ignored', 'too many at once: it was passed over');
      if (lookBack) this.progress();
      return;
    }
    this.queue.push({ file, lookBack });
    this.queuedFiles.add(file);
    this.changed();
    if (!this.draining)
      this.draining = this.drain().finally(() => {
        this.draining = null;
      });
  }

  private progress(): void {
    const lb = this.st.lookBack;
    if (!lb?.running) return;
    const done = lb.done + 1;
    this.st.lookBack = { ...lb, done, running: done < lb.total };
  }

  private async drain(): Promise<void> {
    while (this.queue.length) {
      const job = this.queue.shift()!;
      this.queuedFiles.delete(job.file);
      const gen = this.generation;
      this.reading = path.basename(job.file);
      this.changed();
      try {
        await this.process(job.file, gen);
      } catch (e) {
        // one bad file mustn't stop the rest
        if (gen === this.generation) this.note(path.basename(job.file), 'failed', `something went wrong: ${(e as Error).message}`);
      }
      if (job.lookBack && gen === this.generation) this.progress();
      this.reading = null;
      this.changed();
    }
  }

  /** Count an outcome and remember it as the last file seen. */
  private note(name: string, kind: 'ignored' | 'failed' | 'looked' | 'skipped', why: string): Outcome {
    if (kind === 'ignored') this.st.counts.ignored++;
    if (kind === 'failed') this.st.counts.failed++;
    if (kind === 'looked') this.st.counts.looked++;
    this.st.lastSeen = { at: this.now().toISOString(), name, outcome: why };
    this.changed();
    return { kind, why };
  }

  private rulesFor(p: RulesProfile): (text: string) => RulesResult {
    const key = JSON.stringify([p.name, p.aliases, p.notMe, p.githubLogin]);
    if (this.rules?.key !== key) this.rules = { key, fn: compileRules(p) };
    return this.rules.fn;
  }

  /**
   * One file, start to finish: the filters, OCR, the rules, and Found. Exposed for tests (and anything that wants to
   * hand it a file); `gen` is the generation it was queued under.
   */
  async process(file: string, gen = this.generation): Promise<Outcome> {
    const name = path.basename(file);
    if (name.startsWith('.') || isTempName(name)) return { kind: 'skipped', why: 'a hidden or temporary file' };
    if (!PICTURE_EXT.test(name)) return this.note(name, 'ignored', 'not a picture');
    if (this.settings().onlyScreenshots && !looksLikeScreenshot(name)) return this.note(name, 'ignored', 'not named like a screenshot');
    let st: fs.Stats;
    try {
      st = fs.statSync(file);
    } catch {
      return { kind: 'skipped', why: 'gone before it could be read' };
    }
    if (!st.isFile()) return { kind: 'skipped', why: 'not a file' };
    if (st.size > MAX_BLOB_BYTES) return this.note(name, 'ignored', `too big to keep (${(st.size / 1048576).toFixed(0)} MB; the limit is ${MAX_BLOB_BYTES / 1048576} MB)`);
    if (st.size === 0) return this.note(name, 'ignored', 'empty');
    const bytes = new Uint8Array(fs.readFileSync(file));
    const { mime } = await sniff(bytes, name);
    if (!mime.startsWith('image/')) return this.note(name, 'ignored', 'not a picture, whatever its name says');
    const size = imageSize(bytes);
    if (size && (size.width < MIN_SIDE || size.height < MIN_SIDE)) return this.note(name, 'ignored', `too small to be a screenshot (${size.width}×${size.height})`);
    const sha = sha256Of(bytes);
    const key = `screenshot:${sha}`;
    if (this.o.store.foundIdByKey(key) || this.o.store.achievementIdByKey(key)) return this.note(name, 'skipped', 'already in Found or on your board');
    const profile = this.o.store.profile();
    if (!profile?.name?.trim()) return this.note(name, 'ignored', 'not read: BragDoc doesn’t know your name yet');
    let text: string;
    try {
      text = (await this.o.ocr.read({ bytes })).text;
    } catch (e) {
      if (gen !== this.generation) return { kind: 'skipped', why: 'switched off' };
      return this.note(name, 'failed', `couldn’t be read: ${(e as Error).message}`);
    }
    // switched off, or pointed elsewhere, while it was being read: forget it
    if (gen !== this.generation) return { kind: 'skipped', why: 'switched off' };
    const r = this.rulesFor(profile)(text);
    if (!r.pass || !r.quote) {
      const missing = !r.matched.some((m) => m.rule === 'name' || m.rule === 'initials') ? 'doesn’t name you' : 'no praise or impact near your name';
      return this.note(name, 'looked', `didn’t pass the rules (${text.trim() ? missing : 'no text in it'})`);
    }
    this.st.counts.looked++;
    const added = this.o.services.found.add({
      source: 'screenshots',
      externalKey: key,
      title: titleOf(r.quote),
      ...(r.from || r.where ? { summary: [r.from, r.where].filter(Boolean).join(' in ') } : {}),
      happenedAt: dayIn(st.mtime, profile.timezone),
      quote: { text: r.quote, ...(r.from ? { from: r.from } : {}), ...(r.where ? { where: r.where } : {}) },
      files: [{ path: file, title: name }],
      matchedRules: reasonsOf(r),
    });
    if (!added.created || !added.candidate) {
      this.st.lastSeen = { at: this.now().toISOString(), name, outcome: 'already in Found or on your board' };
      this.changed();
      return { kind: 'skipped', why: 'already in Found or on your board' };
    }
    this.st.counts.sent++;
    this.st.lastMatch = { at: this.now().toISOString(), name };
    this.st.lastSeen = { at: this.now().toISOString(), name, outcome: 'passed the rules: it’s in Found' };
    this.changed();
    return { kind: 'sent', candidateId: added.candidate.id };
  }
}
