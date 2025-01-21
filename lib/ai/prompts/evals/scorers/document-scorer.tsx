import { LLMClassifierFromSpec, type Score } from 'autoevals';

// Function to evaluate the accuracy of extracted achievements with context
const DocumentAccuracy = LLMClassifierFromSpec('DocumentAccuracy', {
  prompt: `
<purpose>
You are an evaluator assessing how well an AI system generated a document based on user data and preferences.
Your task is to evaluate if the generated document follows the user's instructions and effectively presents their achievements.
</purpose>

<background>
bragdoc.ai helps people track their professional achievements and generate documents such as weekly updates,
monthly updates, and performance review documents. The system should generate these documents following user
preferences and instructions while maintaining professionalism and accuracy.
</background>

<instructions>
- Evaluate if the document follows the user's specified language and format preferences
- Check if achievements are properly grouped and prioritized
- Verify that impact metrics are appropriately highlighted
- Ensure the document maintains professionalism without unnecessary fluff
- Consider if the document appropriately responds to the chat history context
- Assess if company and project references are used appropriately
</instructions>

<variables>
  <userMessage>The user's original message</userMessage>
  <userInstructions>The user's instructions for the document</userInstructions>
  <chatHistory>Chat history context</chatHistory>
  <companiesStr>Context about companies</companiesStr>
  <projectsStr>Context about projects</projectsStr>
  <generatedDocument>The generated document</generatedDocument>
</variables>

<data>
  <userMessage>{{{input.input}}}</userMessage>
  <userInstructions>{{{input.userInstructions}}}</userInstructions>
  <chatHistory>{{{input.chatStr}}}</chatHistory>
  <companies>{{{input.companiesStr}}}</companies>
  <projects>{{{input.projectsStr}}}</projects>
  <generatedDocument>{{{output}}}</generatedDocument>
</data>

<evaluationCriteria>
1. Document Structure and Format
   - Does it follow user's language and formatting preferences?
   - Are achievements properly organized and grouped?

2. Content Quality
   - Are achievements clearly and professionally described?
   - Are impact metrics and key results highlighted?
   - Is the content free of unnecessary fluff or exaggeration?

3. Context Awareness
   - Does it appropriately reference and projects?
   - Does it respond effectively to the chat history?
   - Are user instructions followed correctly?

4. Overall Assessment
   Select one of the following grades:
   (A) The document matches expectations perfectly
   (B) The document is good but missing minor details
   (C) The document has minor issues but is generally acceptable
   (D) The document has significant issues or missing information
   (E) The document is completely incorrect or inappropriate
</evaluationCriteria>`,
  choice_scores: {
    A: 1.0, // Perfect match
    B: 0.8, // Good but missing details
    C: 0.6, // Minor issues
    D: 0.3, // Major issues
    E: 0.0, // Completely wrong
  },
});

async function DocumentScorer(args: any): Promise<Score> {
  return DocumentAccuracy(args);
}

export { DocumentScorer };
