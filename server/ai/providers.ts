// A connection + a model name → an AI SDK language model (SPEC R20). Loaded only by server/ai/sdk.ts's import(), so
// nothing here is resolved while AI is off. Every provider is built with `fetch` set to egress's fetchFor(): that's
// the only way any of them reaches the network (test/ai-egress.test.ts stubs globalThis.fetch to throw and checks
// each kind still goes through egress).
//
// - Ollama: the native adapter in ollama.ts (num_ctx, think: false, format: <schema>; D63).
// - LM Studio, llama.cpp, OpenRouter and any OpenAI-compatible server: @ai-sdk/openai-compatible, with
//   json_schema structured outputs (non-strict: our own Zod check is the strict one).
// - Anthropic, OpenAI: their own packages. OpenAI through Chat Completions (`.chat()`), the API every
//   OpenAI-compatible fake and server shares (D65).
// - Jev: not a chat model; it answers decisions only, through the judge (PR28's decide.ts).
import { createAnthropic } from '@ai-sdk/anthropic';
import { createOpenAI } from '@ai-sdk/openai';
import { createOpenAICompatible } from '@ai-sdk/openai-compatible';
import type { LanguageModel } from 'ai';
import { baseUrlOf, contextTokensOf } from '../../shared/ai/connections.js';
import { AiError } from './errors.js';
import { ollamaModel } from './ollama.js';
import type { ModelRequest } from './sdk.js';

/** The language model for one call. `model` is always a name on a connection: never a bare string the SDK resolves. */
export function modelFor({ config, connectionId, model, fetch: send, apiKey, jsonMode }: ModelRequest): LanguageModel {
  const all = config.ai.connections;
  const c = all[connectionId];
  if (!c) throw new AiError('no_model', `there's no AI connection called ${connectionId}`);
  const baseURL = baseUrlOf(c, all);
  if (!baseURL) throw new AiError('no_model', `${connectionId} has no address yet`);
  const headers = {}; // no attribution: egress strips it again on the way out
  switch (c.kind) {
    case 'ollama':
      return ollamaModel({ baseUrl: baseURL, model, contextTokens: contextTokensOf(c, all), fetch: send });
    case 'lmstudio':
    case 'llamacpp':
    case 'openai-compatible':
    case 'openrouter':
      return createOpenAICompatible({
        name: c.kind,
        baseURL,
        ...(apiKey ? { apiKey } : {}),
        headers,
        fetch: send,
        includeUsage: true,
        // a server that refused a schema once gets JSON mode (response_format: json_object) and our own check
        supportsStructuredOutputs: !jsonMode,
      }).chatModel(model);
    case 'anthropic':
      return createAnthropic({ baseURL, apiKey: apiKey ?? '', headers, fetch: send })(model);
    case 'openai':
      return createOpenAI({ baseURL, apiKey: apiKey ?? '', headers, fetch: send }).chat(model);
    case 'jev':
      throw new AiError('failed', 'Jev answers yes-or-no decisions for the judge only; it has no chat model to test or call here');
  }
}
