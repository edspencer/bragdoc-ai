// The plain words Settings → AI says things in (SPEC R17: "reports the outcome in plain words"), and the header chip's
// label. Pure, so they're unit-tested (test/ai-local.test.ts).
import type { AiConnectionView, AiErrorCode, AiGateCode, AiStatus, AiWhere } from '../../../shared/api.ts';
import { KIND_LABEL } from '../../../shared/ai/connections.ts';
import { HOST_CLASS_LABEL } from '../../../shared/ai/hosts.ts';

/** A headline for each way a test (or any call) can fail; the server's own sentence goes under it. */
export const OUTCOME_HEADLINE: Record<AiErrorCode | AiGateCode, string> = {
  unreachable: 'The runner isn’t answering',
  model_missing: 'That model isn’t installed',
  key_refused: 'The key was refused',
  quota: 'The account is out of credit',
  rate_limited: 'Too many requests right now',
  timeout: 'It timed out',
  no_structured_output: 'This model can’t return structured answers',
  bad_output: 'The answer wasn’t usable',
  context_too_long: 'The prompt was too long for this model',
  cancelled: 'Cancelled',
  busy: 'Too much is waiting on this connection',
  failed: 'It didn’t work',
  ai_off: 'AI is off',
  no_model: 'Choose a model first',
  not_consented: 'Not allowed yet: nothing was sent',
  no_key: 'It needs a key: nothing was sent',
};

/** "1.2 s" / "850 ms". */
export function seconds(ms: number): string {
  return ms < 1000 ? `${Math.round(ms)} ms` : `${(ms / 1000).toFixed(ms < 10_000 ? 1 : 0)} s`;
}

/** A connection's name as the page says it: its own name, else its kind's. */
export const connectionName = (c: Pick<AiConnectionView, 'name' | 'kind'>): string => c.name ?? KIND_LABEL[c.kind];

/** Who a cloud connection's requests go to: the provider's name, or the host of a server you typed in. */
export function providerOf(c: Pick<AiConnectionView, 'kind' | 'host'>): string {
  return c.kind === 'anthropic' || c.kind === 'openai' || c.kind === 'openrouter' ? KIND_LABEL[c.kind] : c.kind === 'jev' ? 'OpenRouter' : (c.host ?? 'a server you typed in');
}

/** The header chip (SPEC R26): "AI · this computer", "AI · Anthropic"; null while AI is off (no chip at all). */
export function chipLabel(s: { enabled: boolean; text: AiStatus['text']; connections: Pick<AiConnectionView, 'id' | 'kind' | 'class' | 'host' | 'blocked'>[] } | undefined): string | null {
  if (!s?.enabled) return null;
  const c = s.text ? s.connections.find((x) => x.id === s.text!.connection) : undefined;
  if (!c) return 'AI · no model yet';
  const where = c.class === 'internet' ? providerOf(c) : HOST_CLASS_LABEL[c.class];
  return c.blocked ? `AI · ${where} (not ready)` : `AI · ${where}`;
}

/** Each class's stamp colour: green for this computer, blue for your network, amber for the internet. */
export const CLASS_COLOUR: Record<AiWhere, string> = {
  'this-computer': 'var(--good)',
  'your-network': '#3b6cf6',
  internet: 'var(--warn)',
};

/** "6.6 GB" from bytes (decimal, as model downloads are quoted). */
export function gb(bytes: number | null | undefined): string {
  if (bytes == null) return 'unknown';
  const g = bytes / 1e9;
  return `${g >= 100 ? Math.round(g) : g.toFixed(1)} GB`;
}

/** RAM as people say it: whole GB (os.totalmem is a little under the label on the box). */
export const ramGb = (bytes: number): number => Math.round(bytes / 1024 ** 3);
