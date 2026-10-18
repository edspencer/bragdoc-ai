// Local model runners (SPEC R18, D69–D71): looking for one on this computer when you ask, the hardware readings behind
// "Recommended for this computer", and asking Ollama to download a recommended model after you confirm. Settings → AI
// (PR23) is the only caller, through server/routes/ai-local.ts.
//
// - Detection runs only when you press the button, and only while AI is on: a GET to each runner's default address on
//   this computer (and, inside Docker, the host's Ollama through host.docker.internal), each through egress.probe(),
//   so each is a `feature: detect` line in Network activity. It also looks for an `ollama` program on PATH: a look at
//   the file system, nothing runs (Ollama is never in proc.ts's ALLOWED_BINS). The last result is kept in
//   cache/ai/detect.json (derived, deletable).
// - Hardware is read from the OS, never sent anywhere. Free disk is the home folder's, because that's where Ollama keeps
//   models by default and BragDoc can't know where a runner really stores them; the page says so.
// - A pull goes to the connection's own Ollama through egress.fetchFor({ feature: 'pull' }) (logged as this computer),
//   and the download itself, which Ollama makes from its registry outside BragDoc's process, is logged with
//   egress.logVia('ollama'), the way gh's runs are (D9). Only a model from the recommended table with a known size can
//   be pulled: the confirm has to say how big it is (SPEC principle 2).
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import type { AiDetectedRunner, AiDetectResult, AiHardware, AiPullEvent, AiRunnerKind } from '../../shared/api.js';
import { baseUrlOf } from '../../shared/ai/connections.js';
import { hostClass } from '../../shared/ai/hosts.js';
import { MODELS_AS_OF, RECOMMENDED_MODELS, recommendFor } from '../../shared/ai/models.js';
import { atomicWrite } from '../atomic.js';
import type { Config } from '../config.js';
import type { Egress } from '../egress.js';
import { homePaths } from '../home.js';
import { onPath } from '../proc.js';
import { AiError, classify } from './errors.js';
import { connectionGate, connectionHost } from './policy.js';

/** Where detection looks: each runner's default address (SPEC R17's presets). */
export interface DetectTarget {
  kind: AiRunnerKind;
  /** The base URL a connection would use (Ollama's has no /v1). */
  baseUrl: string;
}

export const DETECT_TARGETS: readonly DetectTarget[] = [
  { kind: 'ollama', baseUrl: 'http://127.0.0.1:11434' },
  { kind: 'lmstudio', baseUrl: 'http://127.0.0.1:1234/v1' },
  { kind: 'llamacpp', baseUrl: 'http://127.0.0.1:8080/v1' },
];
/** Inside Docker, the host's Ollama (compose.yaml's commented extra_hosts makes the name work on Linux). */
export const DOCKER_TARGET: DetectTarget = { kind: 'ollama', baseUrl: 'http://host.docker.internal:11434' };

/** How long one probe waits: a runner on this computer answers in milliseconds, or isn't there. */
const PROBE_TIMEOUT_MS = 2500;

/** Models the UI may ask Ollama to download: the recommended ones whose size we can state in the confirm. */
export const PULLABLE = RECOMMENDED_MODELS.filter((m) => m.downloadGb !== null).map((m) => m.name);

export interface LocalAiOptions {
  dataDir: string;
  config: () => Config;
  egress: Egress;
  /** PATH (for the `ollama` look) and BRAGDOC_IN_DOCKER. */
  env?: NodeJS.ProcessEnv;
  /** The readings (tests: fixtures). */
  hardware?: () => Omit<AiHardware, 'recommended' | 'speedNote' | 'modelsAsOf'>;
  /** Where detection looks (tests: a fake runner on a free port). */
  targets?: readonly DetectTarget[];
  homedir?: string;
}

export interface LocalAi {
  hardware(): AiHardware;
  detect(signal?: AbortSignal): Promise<AiDetectResult>;
  /** The last detection, with `connectionId` worked out against the connections as they are now. */
  lastDetect(): AiDetectResult | null;
  /** Ask a connection's Ollama to download `model`; yields its progress. Throws AiError before anything is sent. */
  pull(connectionId: string, model: string, signal: AbortSignal): AsyncGenerator<AiPullEvent>;
  /** Stop every download in progress (AI switched off, consent revoked): each ends with `code`. */
  cancelAll(code: 'ai_off' | 'not_consented', message: string): void;
}

const GB = 1024 ** 3;

function readHardware(env: NodeJS.ProcessEnv, homedir: string): Omit<AiHardware, 'recommended' | 'speedNote' | 'modelsAsOf'> {
  const cpus = os.cpus();
  const cpu = cpus[0]?.model?.trim() || 'unknown';
  let freeDiskBytes: number | null = null;
  try {
    const s = fs.statfsSync(homedir);
    freeDiskBytes = Number(s.bavail) * Number(s.bsize);
  } catch {
    /* can't tell: the page says so */
  }
  return {
    ramBytes: os.totalmem(),
    cpu,
    cores: cpus.length,
    arch: process.arch,
    appleSilicon: process.platform === 'darwin' && process.arch === 'arm64',
    freeDiskBytes,
    inDocker: env.BRAGDOC_IN_DOCKER === '1',
  };
}

/** The readings plus what they recommend (SPEC R18): 16 GB+ → gemma4:e4b, 8–16 → qwen3.5:4b, under 8 → none. */
export function hardwareView(h: Omit<AiHardware, 'recommended' | 'speedNote' | 'modelsAsOf'>): AiHardware {
  return {
    ...h,
    recommended: recommendFor(h.ramBytes / GB)?.name ?? null,
    speedNote: h.appleSilicon ? null : 'Roughly 15–20 s per item without a GPU: fine in the background.',
    modelsAsOf: MODELS_AS_OF,
  };
}

/** The same runner? Compared as URLs, with the loopback names (localhost, 127.0.0.1, [::1]) treated as one. */
function sameUrl(a: string | null, b: string): boolean {
  if (!a) return false;
  const norm = (s: string) => {
    try {
      const u = new URL(s);
      if (u.hostname === 'localhost' || u.hostname === '[::1]') u.hostname = '127.0.0.1';
      return u.toString().replace(/\/+$/, '').toLowerCase();
    } catch {
      return s.replace(/\/+$/, '').toLowerCase();
    }
  };
  return norm(a) === norm(b);
}

/** How often a running download re-checks that it may still run (AI on, its connection allowed). */
const PULL_WATCH_MS = 1000;

export function createLocalAi(o: LocalAiOptions): LocalAi {
  const env = o.env ?? process.env;
  const file = path.join(homePaths(o.dataDir).cache, 'ai', 'detect.json');
  const homedir = o.homedir ?? os.homedir();
  /** Downloads in progress: each one's stop. */
  const running = new Set<(gate: { code: 'ai_off' | 'not_consented' | 'no_model' | 'no_key'; message: string }) => void>();

  const withConnections = (r: AiDetectResult): AiDetectResult => {
    const all = o.config().ai.connections;
    return {
      ...r,
      runners: r.runners.map((x) => ({ ...x, connectionId: Object.entries(all).find(([, c]) => c.kind === x.kind && sameUrl(baseUrlOf(c, all), x.baseUrl))?.[0] ?? null })),
    };
  };

  async function getJson(url: string, signal: AbortSignal): Promise<unknown | null> {
    try {
      const res = await o.egress.probe({ purpose: 'ai.detect', feature: 'detect' }, url, { signal });
      if (!res.ok) {
        await res.body?.cancel();
        return null;
      }
      return await res.json();
    } catch {
      return null; // refused, nothing listening, not JSON: not a runner
    }
  }

  async function probe(t: DetectTarget, outer?: AbortSignal): Promise<AiDetectedRunner | null> {
    const timeout = AbortSignal.timeout(PROBE_TIMEOUT_MS);
    const signal = outer ? AbortSignal.any([outer, timeout]) : timeout;
    const base = t.baseUrl.replace(/\/+$/, '');
    const where = hostClass(base);
    if (t.kind === 'ollama') {
      const v = (await getJson(`${base}/api/version`, signal)) as { version?: unknown } | null;
      if (!v || typeof v.version !== 'string') return null;
      const tags = (await getJson(`${base}/api/tags`, signal)) as { models?: { name?: unknown; size?: unknown }[] } | null;
      const models = (tags?.models ?? []).filter((m) => typeof m.name === 'string').map((m) => ({ name: m.name as string, sizeBytes: typeof m.size === 'number' ? m.size : null }));
      return { kind: t.kind, baseUrl: base, where, version: v.version.slice(0, 40), models, connectionId: null };
    }
    const j = (await getJson(`${base}/models`, signal)) as { data?: { id?: unknown }[] } | null;
    if (!j || !Array.isArray(j.data)) return null;
    return { kind: t.kind, baseUrl: base, where, version: null, models: j.data.filter((m) => typeof m.id === 'string').map((m) => ({ name: m.id as string, sizeBytes: null })), connectionId: null };
  }

  return {
    hardware: () => hardwareView(o.hardware ? o.hardware() : readHardware(env, homedir)),

    async detect(signal) {
      if (!o.config().ai.enabled) throw new AiError('ai_off', 'AI is off (Settings → AI). Nothing was sent.');
      const inDocker = env.BRAGDOC_IN_DOCKER === '1';
      const targets = [...(o.targets ?? DETECT_TARGETS), ...(inDocker && !o.targets ? [DOCKER_TARGET] : [])];
      // one at a time: they're quick, and the log reads in order
      const runners: AiDetectedRunner[] = [];
      for (const t of targets) {
        const r = await probe(t, signal);
        if (r) runners.push(r);
      }
      const result: AiDetectResult = { at: new Date().toISOString(), runners, ollamaOnPath: onPath('ollama', env) !== null, inDocker };
      try {
        fs.mkdirSync(path.dirname(file), { recursive: true });
        atomicWrite(file, JSON.stringify(result, null, 2) + '\n');
      } catch {
        /* a cache that can't be written only means the next visit shows no result */
      }
      return withConnections(result);
    },

    lastDetect() {
      try {
        const r = JSON.parse(fs.readFileSync(file, 'utf8')) as AiDetectResult;
        return Array.isArray(r?.runners) ? withConnections(r) : null;
      } catch {
        return null;
      }
    },

    async *pull(connectionId, model, outer) {
      const cfg = o.config();
      const conn = cfg.ai.connections[connectionId];
      if (!conn) throw new AiError('failed', `there's no AI connection called ${connectionId}`);
      if (conn.kind !== 'ollama') throw new AiError('failed', 'only an Ollama connection can download a model');
      if (!PULLABLE.includes(model)) throw new AiError('failed', `BragDoc only asks for the recommended models (${PULLABLE.join(', ')}); for anything else, run ollama pull yourself`);
      const gate = connectionGate(cfg, connectionId);
      if (gate) throw new AiError(gate.code, gate.message);
      const host = connectionHost(cfg.ai, connectionId);
      // stopped by the caller (Cancel), by cancelAll (AI off, consent revoked in the app), or by the watch below (the
      // same, by a hand edit of config.yaml): whichever comes first says why
      const ctl = new AbortController();
      let killedBy: { code: 'ai_off' | 'not_consented' | 'no_model' | 'no_key'; message: string } | null = null;
      const kill = (g: NonNullable<typeof killedBy>) => {
        killedBy ??= g;
        ctl.abort();
      };
      const onOuter = () => ctl.abort();
      outer.addEventListener('abort', onOuter, { once: true });
      if (outer.aborted) ctl.abort();
      const watch = setInterval(() => {
        const g = connectionGate(o.config(), connectionId);
        if (g) kill(g);
      }, PULL_WATCH_MS);
      watch.unref?.();
      running.add(kill);
      const signal = ctl.signal;
      const base = baseUrlOf(conn, cfg.ai.connections)!;
      const send = o.egress.fetchFor({ purpose: 'ai.pull', feature: 'pull', model, connectionId });
      const via = (outcome: 'ok' | 'error', error?: string) => o.egress.logVia('ollama', { purpose: 'ai.pull', feature: 'pull', model, outcome, ...(error ? { error } : {}) });
      const stopped = () => (killedBy ? new AiError(killedBy.code, `the download stopped: ${killedBy.message}`) : null);
      let reader: ReadableStreamDefaultReader<string> | null = null;
      // set once Ollama has started the download: from then on it's logged as a registry line too, however it ends
      let started = false;
      let failed: string | null = 'cancelled';
      try {
        let res: Response;
        try {
          res = await send(`${base}/api/pull`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ model, stream: true }), signal });
        } catch (e) {
          throw stopped() ?? classify(e, { connection: connectionId, host, cancelled: signal.aborted });
        }
        if (!res.ok) {
          const text = await res.text().catch(() => '');
          const err = classify(Object.assign(new Error(`HTTP ${res.status}`), { statusCode: res.status, responseBody: text }), { connection: connectionId, host });
          started = true;
          failed = err.message;
          throw err;
        }
        started = true;
        reader = res.body!.pipeThrough(new TextDecoderStream()).getReader();
        let buf = '';
        try {
          for (;;) {
            const { value, done } = await reader.read();
            if (done) break;
            buf += value;
            let i: number;
            while ((i = buf.indexOf('\n')) >= 0) {
              const line = buf.slice(0, i).trim();
              buf = buf.slice(i + 1);
              if (!line) continue;
              let j: { status?: unknown; completed?: unknown; total?: unknown; error?: unknown };
              try {
                j = JSON.parse(line);
              } catch {
                continue;
              }
              if (typeof j.error === 'string') {
                failed = j.error.slice(0, 300);
                throw new AiError('failed', `Ollama couldn't download ${model}: ${failed}`);
              }
              const status = typeof j.status === 'string' ? j.status.slice(0, 120) : '';
              if (status === 'success') failed = null;
              yield { status, ...(typeof j.completed === 'number' ? { completed: j.completed } : {}), ...(typeof j.total === 'number' ? { total: j.total } : {}) };
            }
          }
        } catch (e) {
          if (e instanceof AiError) throw e;
          const s = stopped();
          if (s) {
            failed = s.message;
            throw s;
          }
          if (!signal.aborted) failed = (e as Error).message;
          throw classify(e, { connection: connectionId, host, cancelled: signal.aborted });
        }
        const s = stopped();
        if (s) {
          failed = s.message;
          throw s;
        }
        if (failed === 'cancelled' && !signal.aborted) failed = 'the download stopped before Ollama said it was done';
        if (failed) throw new AiError('failed', failed);
      } finally {
        clearInterval(watch);
        running.delete(kill);
        outer.removeEventListener('abort', onOuter);
        // an early exit (the browser went away) closes Ollama's stream too, not only the request
        ctl.abort();
        await reader?.cancel().catch(() => {});
        if (started) via(failed ? 'error' : 'ok', failed ?? undefined);
      }
    },

    cancelAll(code, message) {
      for (const kill of [...running]) kill({ code, message });
    },
  };
}
