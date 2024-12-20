import { Eval } from "braintrust";
import { LLMClassifierFromSpec } from "autoevals";
import { singleAchievementExamples } from "./dataset";
import { extractAchievement } from "../../lib/ai/extract";

// Convert our examples to the format expected by BrainTrust
const experimentData = singleAchievementExamples.map((example) => ({
  input: { 
    input: example.input, 
    chat_history: example.chat_history 
  },
  expected: example.expected.achievement,
}));

// Function to evaluate the accuracy of extracted achievements
const AchievementAccuracy = LLMClassifierFromSpec("AchievementAccuracy", {
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
Eval("Achievement Extraction", {
  experimentName: "achievement-extraction-accuracy",
  data: () => experimentData,
  task: extractAchievement,
  scores: [AchievementAccuracy],
  trialCount: 3,
  metadata: {
    model: "gpt-4",
    useCase: "single-achievement-logging"
  }
});
