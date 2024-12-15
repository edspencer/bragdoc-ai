import { wrapAISDKModel, Eval } from "braintrust";
import { openai } from "@ai-sdk/openai";
import { generateObject } from "ai";
import { LLMClassifierFromSpec } from "autoevals";
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

type BragResponse = z.infer<typeof bragResponseSchema>;

// Convert our examples to the format expected by BrainTrust
const experimentData = singleBragExamples.map((example) => ({
  input: { 
    input: example.input, 
    chat_history: example.chat_history 
  },
  expected: example.expected.brag,
}));

// Function to extract brags from user messages
async function extractBrag({ input, chat_history }: { input: string; chat_history: ChatTurn[] }): Promise<Brag> {
  const model = wrapAISDKModel(openai.chat("gpt-4"));

  const prompt = [
    {
      role: "system",
      content: `You are an AI assistant that helps users track their professional achievements. 
Extract achievements from user messages and format them as structured data.
Always include:
- A concise title
- A brief summary
- Detailed description
- Time information:
  - eventStart: Must be a valid ISO datetime string (e.g., "2024-12-14T00:00:00Z")
  - eventEnd: Must be a valid ISO datetime string (e.g., "2024-12-14T00:00:00Z")
  - eventDuration: Must be one of: "day", "week", "month", "quarter", "year"

If exact dates are not provided, use the current date (${new Date().toISOString()}) for both start and end dates.
If duration is not clear from the context, default to "day".`,
    },
    ...(chat_history.map(({ role, content }) => ({
      role,
      content: [{ type: "text", text: content }],
    })) as any),
    {
      role: "user",
      content: [{ type: "text", text: input }],
    },
  ];

  const {object} = await generateObject<BragResponse>({
    model,
    messages: prompt,
    output: "object",
    schema: bragResponseSchema,
  });

  // Convert string dates to Date objects and ensure all properties are included
  return {
    title: object.title,
    summary: object.summary,
    details: object.details,
    eventDuration: object.eventDuration,
    eventStart: new Date(object.eventStart),
    eventEnd: new Date(object.eventEnd)
  };
}

const BragAccuracy = LLMClassifierFromSpec("BragAccuracy", {
  prompt: `You are evaluating how well an AI system extracted achievement information from a user message. Compare the extracted achievement with the expected output.
Here is the data:
[BEGIN DATA]
************
[User Message]: {{{input}}}
************
[Expected Achievement]: 
Title: {{{expected.title}}}
Summary: {{{expected.summary}}}
Details: {{{expected.details}}}
Duration: {{{expected.eventDuration}}}
************
[Extracted Achievement]:
Title: {{{output.title}}}
Summary: {{{output.summary}}}
Details: {{{output.details}}}
Duration: {{{output.eventDuration}}}
************
[END DATA]

Compare the extracted achievement with the expected output. Consider title accuracy, summary completeness, detail accuracy, and duration correctness.
Answer by selecting one of the following options:
(A) The extraction matches the expected output perfectly
(B) The extraction captures the main achievement but misses some details
(C) The extraction has minor inaccuracies but is generally correct
(D) The extraction misses key information or has significant inaccuracies
(E) The extraction is completely incorrect or misunderstands the achievement`,
  choice_scores: {
    A: 1.0,   // Perfect match
    B: 0.8,   // Good but missing details
    C: 0.6,   // Minor issues
    D: 0.3,   // Major issues
    E: 0.0,   // Completely wrong
  },
});

// Create the evaluation
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
});
