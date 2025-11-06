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

## Workstreams AI/ML Components

### Embedding Generation

Workstreams use OpenAI embeddings to understand semantic meaning of achievements.

**Model Selection:** `text-embedding-3-small`

Rationale:
- Cost-efficient ($0.00002 per 1,000 tokens)
- Sufficient dimensionality (1536) for semantic clustering
- High performance on semantic similarity tasks
- Supported by OpenAI's latest stability guarantees

**Implementation:**

```typescript
import { embedText } from 'ai';

export async function generateAchievementEmbedding(achievementId: string) {
  // Fetch achievement from database
  const achievement = await getAchievementById(achievementId);
  if (!achievement) throw new Error('Achievement not found');

  // Format for embedding
  const text = formatAchievementForEmbedding(achievement);

  // Generate embedding
  const { embedding } = await embedText({
    model: openai.embedding('text-embedding-3-small'),
    text,
  });

  // Save to database
  await updateAchievementEmbedding(achievementId, embedding);

  return embedding;
}
```

**Cost Estimation:**

For a typical user with 100 achievements:
- Initial batch: 100 embeddings × $0.00002 = $0.002
- Monthly new achievements: ~10 × $0.00002 = $0.0002
- Annual cost: ~$0.003 per user (or ~$1.50 per 500 users)

### DBSCAN Clustering

Workstreams use DBSCAN (Density-Based Spatial Clustering of Applications with Noise) to discover clusters without a predefined number of clusters.

**Why DBSCAN:**

1. **No predetermined k**: Automatically discovers optimal number of clusters
2. **Handles outliers**: Naturally identifies achievements that don't fit any cluster
3. **Flexible cluster shapes**: Not limited to spherical clusters like K-means
4. **Sparse data friendly**: Performs well with embeddings

**Implementation:**

```typescript
import { DBSCAN } from 'density-clustering';

export function clusterEmbeddings(
  embeddings: number[][],
  params: { minPts: number; epsilon?: number }
): ClusteringResult {
  // Find optimal epsilon if not provided
  const epsilon = params.epsilon ?? findOptimalEpsilon(embeddings);

  // Run DBSCAN
  const dbscan = new DBSCAN();
  const clusters = dbscan.run(embeddings, epsilon, params.minPts);

  // Process results
  const labels = new Array(embeddings.length).fill(-1);
  clusters.forEach((cluster, i) => {
    cluster.forEach(idx => {
      labels[idx] = i;
    });
  });

  return {
    clusters,
    labels,
    epsilon,
    outlierCount: embeddings.filter((_, i) => labels[i] === -1).length,
  };
}
```

**Parameter Tuning:**

- **Small datasets (20-99 achievements)**: `minPts=3, outlierThreshold=0.70`
- **Large datasets (100+)**: `minPts=5, outlierThreshold=0.65`
- **Epsilon:** Determined by k-distance plot method

### Clustering Decision Logic

The system decides whether to perform full re-clustering or incremental assignment.

**Full Re-clustering Triggers:**

```typescript
export function decideShouldReCluster(
  currentAchievementCount: number,
  metadata: WorkstreamMetadata | null
): UpdateDecision {
  if (!metadata) {
    return {
      strategy: 'full',
      reason: 'Initial clustering - no previous workstreams found',
    };
  }

  const previousCount = metadata.achievementCountAtLastClustering;
  const percentageIncrease = (currentAchievementCount - previousCount) / previousCount;

  if (percentageIncrease >= 0.10) {
    return {
      strategy: 'full',
      reason: `10% growth in achievements (${previousCount} -> ${currentAchievementCount})`,
    };
  }

  if (currentAchievementCount - previousCount >= 50) {
    return {
      strategy: 'full',
      reason: `50+ new achievements added (${currentAchievementCount - previousCount} new)`,
    };
  }

  const daysSinceLastClustering = Math.floor(
    (Date.now() - metadata.lastFullClusteringAt.getTime()) / (1000 * 60 * 60 * 24)
  );

  if (daysSinceLastClustering >= 30) {
    return {
      strategy: 'full',
      reason: `More than 30 days since last clustering (${daysSinceLastClustering} days)`,
    };
  }

  return {
    strategy: 'incremental',
    reason: 'New achievements below re-clustering thresholds',
  };
}
```

### LLM-Based Workstream Naming

After clustering, the system uses an LLM to generate descriptive names for clusters.

**Implementation:**

```typescript
export async function nameWorkstream(
  achievements: Achievement[],
  user: User
): Promise<{ name: string; description: string }> {
  // Sample up to 15 achievements for context
  const sample = achievements.slice(0, 15);

  // Format achievements for LLM
  const achievementsList = sample
    .map(a => `- ${a.title}${a.summary ? ': ' + a.summary : ''}`)
    .join('\n');

  const llm = getLLM({ task: 'clustering' });

  const { object } = await generateObject({
    model: llm,
    system: 'You are an expert career advisor. Generate concise workstream names.',
    schema: z.object({
      name: z.string().describe('2-5 word workstream name'),
      description: z.string().describe('1-2 sentence description'),
    }),
    prompt: `Based on these achievements, suggest a thematic workstream name and description:\n\n${achievementsList}`,
  });

  return object;
}
```

**Cost Estimation:**

For full clustering with 8 workstreams:
- 8 LLM calls × $0.0001 (estimate) = $0.0008 per clustering
- Annual (2-3 clusterings/year) = ~$0.002 per user

**Total Annual Cost:** ~$0.005/user (or ~$2.50 per 500 users)

### Cost Optimization Strategies

1. **Caching**: Store embeddings to avoid regeneration on failures
2. **Batch Processing**: Generate multiple embeddings in single API call
3. **Reuse Centroids**: Use cached centroid embeddings for similarity matching (no new embeddings)
4. **Selective Naming**: Only name workstreams on full re-clustering, not incremental assignment
5. **Rate Limiting**: Implement per-user rate limits to prevent abuse

### Future Enhancement Opportunities

1. **Fine-tuned Models**: Train custom embeddings for better domain-specific clustering
2. **Merge Suggestions**: Use LLM to suggest workstreams that could be merged (based on centroid similarity)
3. **Temporal Clustering**: Consider achievement dates when clustering (time-series aware)
4. **Category Hints**: Allow users to provide hints ("My iOS projects") to guide clustering
5. **A/B Testing**: Experiment with different clustering parameters per user segment
6. **User Feedback Loop**: Use user refinements to improve clustering parameters

---

**Last Updated:** 2025-11-06 (Workstreams AI/ML components)
**Vercel AI SDK:** v5.0.0
