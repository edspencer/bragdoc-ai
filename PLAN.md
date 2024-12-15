# Plan: Single Brag Logging Example Conversations

## Overview
Create a dataset of example conversations showing different ways users might log individual achievements with the chatbot. These will be used with BrainTrust to evaluate LLM performance.

## Implementation Steps

### 1. Create Dataset Structure
```typescript
// ai-docs/datasets/single_brag.ts
interface SingleBragDataset {
  conversations: Conversation[];
}

interface Conversation {
  description: string;  // what this conversation demonstrates
  input: string;       // initial user message
  chat_history: ChatTurn[];
  expected: {
    brag: {
      title: string;
      summary: string;
      details: string;
      eventStart: Date;
      eventEnd: Date;
      eventDuration: 'day' | 'week' | 'month' | 'quarter' | 'year';
      companyId?: string;
    };
    response: string;  // expected LLM response
  };
}
```

### 2. Example Conversation Categories
Create examples for each of these scenarios:

1. Direct Achievement Statement
   - "I just shipped feature X"
   - "I completed the migration to Y"
   - "Finally fixed that nasty bug in Z"

2. Casual/Informal Mentions
   - "Hey, wanted to mention I got that thing working"
   - "Quick update - presentation went really well"
   - "You won't believe what I managed to do today"

3. Achievements with Metrics
   - "Improved performance by 50%"
   - "Onboarded 10 new customers"
   - "Reduced error rate from 5% to 1%"

4. Team Contributions
   - "Led the team to complete X"
   - "Mentored junior dev through Y"
   - "Coordinated with design on Z"

5. Process Improvements
   - "Automated our deployment process"
   - "Implemented new code review guidelines"
   - "Set up monitoring system"

### 3. Implementation Plan

1. Create Base Dataset File
```typescript
// ai-docs/datasets/single_brag_base.ts
export const singleBragExamples = [
  {
    description: "Direct achievement with metrics",
    input: "Just deployed our new caching layer, reduced API latency by 45%",
    chat_history: [],
    expected: {
      brag: {
        title: "Deployed Caching Layer with 45% Performance Improvement",
        summary: "Implemented and deployed a new caching system that reduced API latency by 45%",
        details: "Led the implementation of a new caching layer...",
        eventStart: new Date(),
        eventEnd: new Date(),
        eventDuration: "day"
      },
      response: "That's a significant achievement! I've recorded your deployment of the caching layer and the impressive 45% reduction in API latency. Would you like to add any details about the implementation process or the impact on user experience?"
    }
  },
  // Add 15-20 more diverse examples
]
```

2. Create BrainTrust Eval
```typescript
// ai-docs/evals/single_brag_eval.ts
import { wrapAISDKModel, Eval } from "braintrust";
import { singleBragExamples } from "../datasets/single_brag_base";

const experimentData = singleBragExamples.map(...)

Eval("Single Brag Processing", {
  experimentName: "brag-extraction-accuracy",
  data: () => experimentData,
  task: processSingleBrag,
  scores: [
    BragAccuracy,    // Did it capture the achievement correctly?
    MetricsCapture,  // Did it extract numerical metrics?
    ToneQuality      // Was the response encouraging and appropriate?
  ],
  trialCount: 3,
  metadata: {
    model: "gpt-4",
    useCase: "single-brag-logging"
  }
})
```

### 4. Quality Criteria
Each example conversation should:
- Have clear expected output
- Test different aspects of brag extraction
- Include various writing styles
- Cover different achievement types
- Include relevant metadata (dates, duration, etc.)

### 5. Next Steps
1. Create `single_brag_base.ts` with initial examples
2. Implement BrainTrust evaluation
3. Run initial tests and refine examples
4. Add more complex scenarios
5. Document patterns and best practices found

### 6. Future Expansions
- Add multilingual examples
- Include industry-specific achievements
- Add examples with attachments/links
- Include examples needing clarification
- Add examples with company context
