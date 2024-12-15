# Plan: Single Brag Logging Example Conversations

## Completed Steps

### 1. Directory Structure 
Current structure:
```
/
├── evals/                    # BrainTrust evaluations
│   ├── single-brag/         # Single brag logging evaluations
│   │   ├── eval.ts         # BrainTrust evaluation setup
│   │   ├── dataset.ts      # Example conversations
│   │   ├── generator.ts    # Generator for example conversations
│   │   └── generated/      # Generated example conversations
│   └── types.ts            # Shared types for evals
├── test/                    # Jest tests
│   └── evals/
│       └── single-brag/
│           ├── dataset.test.ts
│           └── processing.test.ts
└── jest.config.ts
```

### 2. Test Dependencies 
```bash
pnpm add -D jest @types/jest ts-jest @testing-library/jest-dom @swc/jest tsx
```

### 3. Jest Configuration 
Set up with @swc/jest for improved performance.

### 4. Dataset Structure 
Implemented in `evals/types.ts` and `evals/single-brag/dataset.ts`.

### 5. Example Generator 
Added `generator.ts` to programmatically create example conversations with:
- Varied metrics and achievements
- Different time durations
- Proper date handling
- JSON output format

## Remaining Implementation Steps

### 1. Expand Example Categories
Currently implemented:
- Technical achievements with metrics
- Leadership achievements with metrics

Still needed:
- Casual/Informal mentions
- Process improvements
- Team contributions without metrics
- More varied response templates

### 2. BrainTrust Evaluation Setup
```typescript
// evals/single-brag/eval.ts
import { wrapAISDKModel, Eval } from "braintrust";
import { openai } from "@ai-sdk/openai";
import { generateObject } from "ai";
import { z } from "zod";
import { singleBragExamples } from "./dataset";
import { Brag, ChatTurn } from "../types";

const bragResponseSchema = z.object({
  title: z.string(),
  summary: z.string(),
  details: z.string(),
  eventStart: z.string().datetime(),
  eventEnd: z.string().datetime(),
  eventDuration: z.enum(["day", "week", "month", "quarter", "year"])
});

Eval("Brag Extraction", {
  experimentName: "brag-extraction-accuracy",
  data: () => experimentData,
  task: extractBrag,
  scores: [BragAccuracy],
  trialCount: 3,
  metadata: {
    model: "gpt-4",
    useCase: "single-brag-logging"
  }
})
```

### 3. Completed Evaluations
- Initial evaluation run completed with 77.78% BragAccuracy score
- Fixed datetime and duration validation issues in the model output
- Average response time: 3.54s
- Token usage: ~383 tokens per request (285 prompt, 98 completion)
- Cost efficiency: ~$0.01 per request

### 4. Quality Improvements
Each example conversation should:
- Have clear expected output
- Test different aspects of brag extraction
- Include various writing styles
- Cover different achievement types
- Include relevant metadata (dates, duration, etc.)

### 5. Future Expansions
- Add multilingual examples
- Include industry-specific achievements
- Add examples with attachments/links
- Include examples needing clarification
- Add examples with company context

## Testing Status
- Basic structure tests
- Date validation tests
- Required fields tests
- Content quality tests
- Processing tests
- BrainTrust evaluation tests
