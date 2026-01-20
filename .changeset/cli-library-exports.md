---
"@bragdoc/cli": patch
---

Export core extraction functions as a library for programmatic use

The CLI package now exports its core extraction functionality, allowing other tools to use the same achievement extraction logic:

- `renderExecute` - Render prompt and extract achievements from commits
- `render`, `execute`, `executeStream` - Lower-level extraction functions
- `getExtractionModel`, `createLLMFromConfig` - LLM configuration utilities
- Types: `Commit`, `Repository`, `ExtractedAchievement`, etc.

Usage:
```typescript
import { renderExecute, type Commit } from '@bragdoc/cli';

const achievements = await renderExecute(
  { commits, repository, companies, projects, user },
  { model: customModel } // optional - uses CLI config if omitted
);
```
