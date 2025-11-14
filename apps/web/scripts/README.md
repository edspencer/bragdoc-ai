# Web App Scripts

This directory contains utility scripts for the BragDoc web application.

## generate-demo-embeddings.ts

Pre-generates embeddings for all achievements in the demo data to optimize demo account creation.

### Purpose

When a demo account is created, it imports achievements from `lib/ai/demo-data.json`. If these achievements don't have embeddings, they need to be generated on-demand when the user generates workstreams. This script pre-computes embeddings and stores them in the demo data file, which:

- Reduces latency for demo users generating workstreams
- Avoids redundant API calls to OpenAI for the same dataset
- Reduces operational costs by not regenerating the same embeddings repeatedly

### Usage

```bash
# From the apps/web directory
pnpm generate-demo-embeddings

# Or directly with tsx
npx tsx scripts/generate-demo-embeddings.ts
```

### Requirements

- `OPENAI_API_KEY` environment variable must be set
- Demo data file must exist at `lib/ai/demo-data.json`

### How It Works

1. Reads demo data from `lib/ai/demo-data.json`
2. For each achievement without an embedding:
   - Formats the achievement text (using the same logic as `lib/ai/embeddings.ts`)
   - Generates embedding using OpenAI's `text-embedding-3-small` model
   - Stores the embedding, model version, and timestamp in the achievement object
3. Writes the updated data back to the JSON file

### Performance

- Processes achievements in batches of 10 to avoid rate limits
- Includes 1-second delay between batches
- For 348 achievements, takes approximately 3-5 minutes to complete
- Increases demo data file size from ~1-2MB to ~11MB (due to 1536-dimensional embeddings)

### Notes

- The embedding format and logic MUST match `lib/ai/embeddings.ts`
- Run this script whenever the demo data is updated with new achievements
- The script is idempotent - it only generates embeddings for achievements that don't have them
- Embeddings are automatically used during import if present in the data (see `lib/import-user-data.ts`)
