import { wrapAISDKModel, Eval } from "braintrust";
import { openai } from "@ai-sdk/openai";
import { LLMClassifierFromSpec } from "autoevals";
import { contextBragExamples } from "./dataset";
import { extractBrag } from "../../lib/ai/extract";


// export type CompanyContext = {
//   id: string;
//   name: string;
//   role: string;
//   domain?: string;
//   startDate: Date;
//   endDate?: Date;
// };

// export type ProjectContext = {
//   id: string;
//   name: string;
//   companyId?: string;
//   description: string;
//   startDate?: Date;
//   endDate?: Date;
// };

// Convert our examples to the format expected by BrainTrust
const experimentData = contextBragExamples.map((example) => ({
  input: {
    ...example.input,
    chatStr: example.input.chat_history
      .map(({ role, content }) => `${role}: ${content}`)
      .join("\n"),
    companiesStr: example.input.context.companies
      .map((company) => `
Name: ${company.name}
Role: ${company.role}
Domain: ${company.domain}
Start Date: ${company.startDate}
End Date: ${company.endDate}
      `)
      .join("\n"),
    projectsStr: example.input.context.projects
      .map((project) => `
Name: ${project.name}
Company: ${project.companyId}
Description: ${project.description}
Start Date: ${project.startDate}
End Date: ${project.endDate}
      `)
      .join("\n"),
  },
  expected: example.expected,
}));

// Function to evaluate the accuracy of extracted brags with context
const BragContextAccuracy = LLMClassifierFromSpec("BragContextAccuracy", {
  prompt: `You are evaluating how well an AI system extracted achievement information with company and project context from a user message. Compare the extracted achievement with the expected output.

Here is the data:
[BEGIN DATA]
************
[User Message]: {{{input.input}}}

[Chat History]:
{{{input.chatStr}}}

[Context]:

## Companies:

{{{input.companiesStr}}}

## Projects:

{{{input.projectsStr}}}

************
[Expected Achievement]: 
Title: {{{expected.brag.title}}}
Summary: {{{expected.brag.summary}}}
Details: {{{expected.brag.details}}}
Duration: {{{expected.brag.eventDuration}}}
Company ID: {{{expected.companyId}}}
Project ID: {{{expected.projectId}}}
Suggest New Project: {{{expected.suggestNewProject}}}
************
[Extracted Achievement]:
Title: {{{expected.brag.title}}}
Summary: {{{expected.brag.summary}}}
Details: {{{expected.brag.details}}}
Duration: {{{expected.brag.eventDuration}}}
Company ID: {{{expected.companyId}}}
Project ID: {{{expected.projectId}}}
Suggest New Project: {{{expected.suggestNewProject}}}
************
[END DATA]

Compare the extracted achievement with the expected output. Consider:
1. Achievement Information Accuracy:
   - Title accuracy and clarity
   - Summary completeness
   - Detail accuracy and relevance
   - Duration appropriateness

2. Context Attribution:
   - Company attribution accuracy
   - Project attribution accuracy
   - Appropriateness of project suggestions

Answer by selecting one of the following options:
(A) Perfect match in both achievement and context attribution
(B) Achievement details correct but minor context attribution issues
(C) Achievement mostly correct but significant context issues
(D) Major issues in either achievement or context attribution
(E) Completely incorrect in both achievement and context`,
  choice_scores: {
    A: 1.0,   // Perfect match
    B: 0.8,   // Good but context issues
    C: 0.6,   // Achievement ok, context wrong
    D: 0.3,   // Major issues
    E: 0.0,   // Completely wrong
  }
});

// Create the evaluation
Eval("brag-company-and-project", {
  data: experimentData,
  task: extractBrag,
  scores: [BragContextAccuracy],
  trialCount: 3,
  metadata: {
    model: "gpt-4",
    description: "Evaluating brag extraction with company and project context",
    owner: "ed"
  }
});
