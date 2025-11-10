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

## Workstream Clustering

### Embedding Generation

**Model:** OpenAI text-embedding-3-small (1536 dimensions)

Embeddings are generated for each achievement by combining title, summary, and short details:

**Files:** `apps/web/lib/ai/embeddings.ts`

- Text preprocessing combines achievement fields
- Batch generation for efficiency
- Stored in Achievement table using pgvector
- Cost: ~$0.02 per 1M tokens (~$0.002 per 1000 achievements)

### DBSCAN Clustering

**Files:** `apps/web/lib/ai/clustering.ts`

Density-based clustering for automatic workstream discovery:

- **Algorithm:** DBSCAN (density-clustering npm package)
- **Distance Metric:** Cosine distance between embeddings
- **Parameters:** Adaptive based on dataset size (minPts: 3-5, outlierThreshold: 0.65-0.70)
- **Epsilon Selection:** K-distance plot elbow detection

### Workstream Naming

LLM generates descriptive names and summaries for clusters:

**Files:** `apps/web/lib/ai/workstreams.ts`

- Samples up to 15 representative achievements
- Generates 2-5 word names and 1-sentence descriptions
- Falls back to regex extraction on JSON parse errors

### Incremental Assignment

For efficiency, new achievements are assigned to existing workstreams without full re-clustering:

- Compare embedding to cached centroids using cosine similarity
- Assign if confidence exceeds threshold (0.65-0.70)
- Update centroids after assignments

### Data Enrichment Helper Functions

After clustering operations complete, helper functions fetch detailed achievement data to enrich API responses. This enables future UI components to display exactly what happened during workstream generation.

**Files:** `apps/web/lib/ai/workstreams.ts`

#### getAchievementSummaries

Fetches achievements with project/company context using efficient LEFT JOINs:

```typescript
export async function getAchievementSummaries(
  achievementIds: string[],
  userId: string,
): Promise<AchievementSummary[]>;
```

- **Input:** Array of achievement IDs to fetch
- **Output:** AchievementSummary objects with title, date, impact, and context fields
- **Optimization:** Uses inArray filter and LEFT JOINs to fetch all data in single query
- **Security:** Scoped by userId (no cross-user data)
- **Performance:** <50ms for typical datasets (1000 achievements)

#### buildAssignmentBreakdown

Groups achievements by workstream for incremental clustering responses:

```typescript
export async function buildAssignmentBreakdown(
  assignments: Map<string, string>,
  userId: string,
): Promise<AssignmentByWorkstream[]>;
```

- **Input:** Map<achievementId, workstreamId> from incremental assignment
- **Output:** Array of workstream groups with their assigned achievements
- **Process:** Groups IDs → fetches workstream details → fetches achievement summaries
- **Sorting:** By achievement count (descending)
- **Performance:** ~50-100ms additional time for typical datasets

#### buildWorkstreamBreakdown

Formats newly created workstreams with their achievements for full clustering responses:

```typescript
export async function buildWorkstreamBreakdown(
  createdWorkstreams: Workstream[],
  userId: string,
): Promise<WorkstreamDetail[]>;
```

- **Input:** Array of newly created Workstream records
- **Output:** Array of workstream details with all assigned achievements
- **Process:** For each workstream, fetch achievements → convert to summaries
- **Sorting:** By achievement count (descending)
- **Performance:** ~50-100ms additional time for typical datasets

### Data Enrichment Pattern

The API response workflow follows this pattern:

1. **Clustering** (full or incremental) - DBSCAN or centroid assignment
2. **Data Capture** - Clustering function returns IDs of affected achievements
3. **Enrichment** - Helper functions fetch full achievement data with context
4. **Response** - API route returns clustered workstreams with detailed breakdowns

This design provides several benefits:
- **Separation of Concerns**: Clustering logic separate from data fetching
- **Reusability**: Helper functions can be called from different endpoints
- **Efficiency**: Uses LEFT JOINs to avoid N+1 queries
- **Future Extensibility**: Easy to add new response formats

### Performance Characteristics

For typical users with <1000 achievements:

- **Embedding Generation**: ~1-2 seconds for batch processing
- **Clustering**: <100ms with DBSCAN
- **Data Enrichment**: ~50-100ms with optimized queries
- **Total API Response**: <2 seconds for first generation, <500ms for incremental

All queries use indexes on userId, workstreamId, and projectId for optimal performance.

---

**Last Updated:** 2025-11-07
**Vercel AI SDK:** v5.0.0
