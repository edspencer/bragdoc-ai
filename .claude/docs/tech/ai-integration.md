# AI/LLM Integration

## Overview

BragDoc uses the Vercel AI SDK v5 to integrate multiple LLM providers for achievement extraction, document generation, and chat functionality.

## Supported Providers

### Web Application
- OpenAI (GPT-4, GPT-4o, GPT-3.5-turbo)
- Google Gemini (Gemini-1.5-pro, Gemini-2.0-flash)
- DeepSeek (deepseek-chat)
- Anthropic Claude (planned)

### CLI Tool
- OpenAI
- Google Gemini
- DeepSeek
- Anthropic Claude (Claude-3.5-Sonnet, Opus)
- Ollama (local models: llama3.2, qwen2.5-coder, etc.)
- OpenAI-compatible APIs (LM Studio, LocalAI, etc.)

## LLM Router

**File:** `apps/web/lib/ai/llm-router.ts`

Intelligently selects the appropriate LLM provider based on:
- Task type (extraction, generation, chat)
- User subscription level
- Provider availability

```typescript
export async function getLLM(
  user: User,
  taskType: 'extraction' | 'generation' | 'chat'
): Promise<LanguageModel> {
  // Selection logic based on user.level and taskType
  // Returns configured model from @ai-sdk/*
}
```

## Achievement Extraction

**File:** `apps/web/lib/ai/extract-achievements.ts`

Extracts achievements from Git commits using streaming:

```typescript
import { streamObject } from 'ai';
import { getLLM } from './llm-router';

export async function* extractAchievements(commits: Commit[], user: User) {
  const llm = await getLLM(user, 'extraction');
  
  const { partialObjectStream } = streamObject({
    model: llm,
    schema: achievementSchema,
    prompt: renderPrompt(commits),
    temperature: 0, // Deterministic extraction
  });

  for await (const achievement of partialObjectStream) {
    if (achievement) yield achievement;
  }
}
```

## Prompt Engineering

### MDX Prompts

**Location:** `apps/web/lib/ai/prompts/*.prompt.mdx`

Prompts are written in MDX for maintainability:

```mdx
---
model: gpt-4
temperature: 0
---

# Achievement Extraction

Extract achievements from the following Git commits:

<Commits commits={commits} />

Return as JSON array matching this schema:
- title: Brief description
- summary: 1-2 sentence summary
- impact: 1-10 scale
```

**Usage:**
```typescript
import { renderMDXPromptFile } from 'mdx-prompt';
import extractPrompt from './prompts/extract.prompt.mdx';

const prompt = await renderMDXPromptFile(extractPrompt, { commits });
```

## Vercel AI SDK Patterns

### Streaming Text
```typescript
import { streamText } from 'ai';

const result = streamText({
  model: llm,
  messages,
  temperature: 0.7,
  maxTokens: 2000,
});

return result.toDataStreamResponse();
```

### Streaming Objects
```typescript
import { streamObject } from 'ai';
import { z } from 'zod';

const schema = z.object({
  achievements: z.array(z.object({
    title: z.string(),
    summary: z.string(),
    impact: z.number().int().min(1).max(10),
  })),
});

const { partialObjectStream } = streamObject({
  model: llm,
  schema,
  prompt,
  temperature: 0,
});

for await (const partial of partialObjectStream) {
  console.log(partial);
}
```

### Generate Text
```typescript
import { generateText } from 'ai';

const { text } = await generateText({
  model: llm,
  prompt: 'Summarize these achievements...',
  temperature: 0.7,
});
```

## CLI LLM Configuration

**File:** `~/.bragdoc/config.yml`

```yaml
llm:
  provider: 'openai'  # openai, anthropic, google, deepseek, ollama, openai-compatible
  openai:
    apiKey: 'sk-...'
    model: 'gpt-4o'
  anthropic:
    apiKey: 'sk-ant-...'
    model: 'claude-3-5-sonnet-20241022'
  ollama:
    model: 'llama3.2'
    baseUrl: 'http://localhost:11434'
```

**Commands:**
```bash
bragdoc llm show               # Show current configuration
bragdoc llm set openai         # Set provider to OpenAI
bragdoc llm set anthropic      # Set provider to Anthropic
bragdoc llm set ollama llama3.2  # Set to local Ollama model
```

## Provider Configuration

### OpenAI
```typescript
import { createOpenAI } from '@ai-sdk/openai';

const openai = createOpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const model = openai('gpt-4o', {
  temperature: 0,
});
```

### Anthropic Claude
```typescript
import { createAnthropic } from '@ai-sdk/anthropic';

const anthropic = createAnthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const model = anthropic('claude-3-5-sonnet-20241022');
```

### Google Gemini
```typescript
import { createGoogleGenerativeAI } from '@ai-sdk/google';

const google = createGoogleGenerativeAI({
  apiKey: process.env.GOOGLE_API_KEY,
});

const model = google('gemini-2.0-flash-exp');
```

### Ollama (Local)
```typescript
import { ollama } from 'ollama-ai-provider-v2';

const model = ollama('llama3.2', {
  baseURL: 'http://localhost:11434',
});
```

## Temperature Settings

- **Extraction (0):** Deterministic, factual extraction from commits
- **Generation (0.7):** Creative document generation
- **Chat (0.7-0.9):** Conversational responses

## Token Management

Track usage in Chat table:

```typescript
export interface AppUsage {
  promptTokens?: number;
  completionTokens?: number;
  totalTokens?: number;
  cost?: number;
  modelId?: string;
}
```

---

**Last Updated:** 2025-10-21
**Vercel AI SDK:** v5.0.0
