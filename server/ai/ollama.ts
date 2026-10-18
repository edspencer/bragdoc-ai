// Ollama through its native /api/chat, as an AI SDK language model (SPEC R20, D63). The OpenAI-compatible /v1 can't
// set the context size, so a long prompt would be cut to Ollama's default of about 4k tokens without a word; natively
// every call sends `options.num_ctx` (the connection's contextTokens), `think: false`, and the JSON schema as `format`
// (grammar-constrained output, the Found spike's settings: eval-judge.js). Loaded only through providers.ts, after
// the SDK (server/ai/sdk.ts): the fetch it's given is egress's, the only network it has.
import { APICallError } from '@ai-sdk/provider';
import type { LanguageModelV4, LanguageModelV4CallOptions, LanguageModelV4GenerateResult, LanguageModelV4Prompt, LanguageModelV4StreamPart, LanguageModelV4Usage } from '@ai-sdk/provider';
import type { ProviderFetch } from '../egress.js';

export interface OllamaModelOptions {
  baseUrl: string;
  model: string;
  contextTokens: number;
  fetch: ProviderFetch;
}

interface OllamaMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface OllamaChunk {
  message?: { content?: string };
  done?: boolean;
  done_reason?: string;
  prompt_eval_count?: number;
  eval_count?: number;
  error?: string;
}

/** Text only: v0.2 sends no pictures and no tools (SPEC principle 9). */
function messages(prompt: LanguageModelV4Prompt): OllamaMessage[] {
  return prompt.flatMap((m): OllamaMessage[] => {
    if (m.role === 'system') return [{ role: 'system', content: m.content }];
    if (m.role === 'user' || m.role === 'assistant') {
      const text = m.content
        .map((p) => {
          if (p.type === 'text') return p.text;
          throw new Error(`BragDoc sends models text only (not ${p.type})`);
        })
        .join('');
      return [{ role: m.role, content: text }];
    }
    throw new Error('BragDoc gives models no tools');
  });
}

const usage = (c: OllamaChunk): LanguageModelV4Usage => ({
  inputTokens: { total: c.prompt_eval_count, noCache: undefined, cacheRead: undefined, cacheWrite: undefined },
  outputTokens: { total: c.eval_count, text: c.eval_count, reasoning: undefined },
});

const finish = (c: OllamaChunk) => ({ unified: c.done_reason === 'length' ? ('length' as const) : ('stop' as const), raw: c.done_reason });

export function ollamaModel({ baseUrl, model, contextTokens, fetch }: OllamaModelOptions): LanguageModelV4 {
  const url = `${baseUrl.replace(/\/+$/, '')}/api/chat`;

  const body = (o: LanguageModelV4CallOptions, stream: boolean) => {
    const rf = o.responseFormat;
    return {
      model,
      stream,
      think: false,
      messages: messages(o.prompt),
      ...(rf?.type === 'json' ? { format: rf.schema ?? 'json' } : {}),
      options: {
        num_ctx: contextTokens,
        ...(o.temperature !== undefined ? { temperature: o.temperature } : {}),
        ...(o.maxOutputTokens !== undefined ? { num_predict: o.maxOutputTokens } : {}),
        ...(o.topP !== undefined ? { top_p: o.topP } : {}),
        ...(o.topK !== undefined ? { top_k: o.topK } : {}),
        ...(o.seed !== undefined ? { seed: o.seed } : {}),
        ...(o.stopSequences?.length ? { stop: o.stopSequences } : {}),
      },
    };
  };

  async function post(o: LanguageModelV4CallOptions, stream: boolean): Promise<{ res: Response; sent: ReturnType<typeof body> }> {
    const sent = body(o, stream);
    const res = await fetch(url, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(sent), signal: o.abortSignal });
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      let message = `Ollama answered ${res.status}`;
      try {
        message = (JSON.parse(text) as { error?: string }).error ?? message;
      } catch {
        /* not JSON */
      }
      throw new APICallError({ message, url, requestBodyValues: { model }, statusCode: res.status, responseBody: text, isRetryable: false });
    }
    return { res, sent };
  }

  return {
    specificationVersion: 'v4',
    provider: 'ollama',
    modelId: model,
    supportedUrls: {},

    async doGenerate(o): Promise<LanguageModelV4GenerateResult> {
      const { res } = await post(o, false);
      const c = (await res.json()) as OllamaChunk;
      if (c.error) throw new APICallError({ message: c.error, url, requestBodyValues: { model }, statusCode: 500, responseBody: JSON.stringify(c), isRetryable: false });
      return { content: [{ type: 'text', text: c.message?.content ?? '' }], finishReason: finish(c), usage: usage(c), warnings: [] };
    },

    async doStream(o) {
      const { res } = await post(o, true);
      const reader = res.body!.pipeThrough(new TextDecoderStream()).getReader();
      let buf = '';
      let started = false;
      const stream = new ReadableStream<LanguageModelV4StreamPart>({
        start(controller) {
          controller.enqueue({ type: 'stream-start', warnings: [] });
        },
        async pull(controller) {
          for (;;) {
            const nl = buf.indexOf('\n');
            if (nl >= 0) {
              const line = buf.slice(0, nl).trim();
              buf = buf.slice(nl + 1);
              if (!line) continue;
              let c: OllamaChunk;
              try {
                c = JSON.parse(line) as OllamaChunk;
              } catch {
                controller.enqueue({ type: 'error', error: new Error(`Ollama sent a line that isn't JSON`) });
                continue;
              }
              if (c.error) {
                controller.enqueue({ type: 'error', error: new APICallError({ message: c.error, url, requestBodyValues: { model }, statusCode: 500, responseBody: line, isRetryable: false }) });
                controller.close();
                return;
              }
              const delta = c.message?.content ?? '';
              if (delta) {
                if (!started) controller.enqueue({ type: 'text-start', id: '0' });
                started = true;
                controller.enqueue({ type: 'text-delta', id: '0', delta });
              }
              if (c.done) {
                if (started) controller.enqueue({ type: 'text-end', id: '0' });
                controller.enqueue({ type: 'finish', usage: usage(c), finishReason: finish(c) });
                controller.close();
                await reader.cancel().catch(() => {});
                return;
              }
              if (delta) return; // one delta per pull keeps backpressure honest
              continue;
            }
            const { value, done } = await reader.read();
            if (done) {
              // the stream ended without Ollama's `done` line: the runner went away mid-answer
              controller.enqueue({ type: 'error', error: new TypeError('fetch failed: Ollama closed the stream before it finished (terminated)') });
              controller.close();
              return;
            }
            buf += value;
          }
        },
        cancel() {
          void reader.cancel().catch(() => {});
        },
      });
      return { stream };
    },
  };
}
