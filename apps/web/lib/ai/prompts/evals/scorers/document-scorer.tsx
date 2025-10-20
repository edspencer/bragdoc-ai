// @ts-nocheck
import React from 'react';
import { LLMClassifierFromSpec, type Score } from 'autoevals';
import { renderMDX } from 'mdx-prompt';

import {
  Prompt,
  Purpose,
  Instructions,
  InputFormat,
  OutputFormat,
  Variables,
  ChatHistory,
} from 'mdx-prompt/components';

import { Achievements, Company, Project } from '../../elements';

import type {
  Project as ProjectType,
  Company as CompanyType,
} from '@/database/schema';

const outputFormat = `
(A) The document matches expectations perfectly
(B) The document is good but missing minor details
(C) The document has minor issues but is generally acceptable
(D) The document has significant issues or missing information
(E) The document is completely incorrect or inappropriate`;

const instructions = [
  "Evaluate if the document follows the user's specified language and format preferences",
  'Check if achievements are properly grouped and prioritized',
  'Verify that impact metrics are appropriately highlighted',
  'Ensure the document maintains professionalism without unnecessary fluff',
  'Consider if the document appropriately responds to the chat history context',
  'Assess if company and project references are used appropriately',
  'Check if user instructions are followed correctly',
  'Rate the document based on its accuracy and professionalism',

  `Respect the following evaluation criteria:
  
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
   ${outputFormat}`,
];

export interface DocumentScorerProps {
  generatedDocument: string;
  achievements: any;
  userInstructions: string;
  chatHistory: any;
  days: number;
  company?: CompanyType;
  project?: ProjectType;
}

function EvaluateGeneratedDocumentPrompt({
  achievements,
  generatedDocument,
  userInstructions,
  chatHistory,
  days,
  company,
  project,
}: DocumentScorerProps) {
  return (
    <Prompt>
      <Purpose>
        You are an evaluator assessing how well an AI system generated a
        document based on user data and preferences. Your task is to evaluate if
        the generated document follows the user&apos;s instructions and
        effectively presents their achievements.
      </Purpose>
      <background>
        bragdoc.ai helps people track their professional achievements and
        generate documents such as weekly updates, monthly updates, and
        performance review documents. The system should generate these documents
        following user preferences and instructions while maintaining
        professionalism and accuracy.
      </background>
      <Instructions instructions={instructions} />
      <InputFormat>
        <achievements>
          The Achievements that the user has accomplished in the time period
        </achievements>
        <days>
          The number of days for which the document is being generated
        </days>
        <generated-document>The generated document</generated-document>
        <user-instructions>
          The user&apos;s instructions for the document
        </user-instructions>
        <chat-history>The chat history context (if any)</chat-history>
        <company>The company context (if any)</company>
        <project>The project context (if any)</project>
      </InputFormat>
      <OutputFormat
        format={`Answer by selecting one of the following options: ${outputFormat}`}
      />
      <Variables>
        <Achievements achievements={achievements} />
        <days>{days}</days>
        <generated-document>{generatedDocument}</generated-document>
        <user-instructions>{userInstructions}</user-instructions>
        <ChatHistory messages={chatHistory} />
        <Company company={company} />
        <Project project={project} />
      </Variables>
    </Prompt>
  );
}

export async function DocumentScorer(args: any): Promise<Score> {
  const prompt = await renderMDX(
    <EvaluateGeneratedDocumentPrompt
      achievements={args.input.achievements}
      generatedDocument={args.output}
      userInstructions={args.input.userInstructions}
      chatHistory={args.input.chatHistory}
      days={args.input.days}
      company={args.input.company}
      project={args.input.project}
    />,
  );

  return LLMClassifierFromSpec('DocumentScorer', {
    prompt,
    choice_scores: {
      A: 1.0, // Perfect match
      B: 0.8, // Good but missing details
      C: 0.6, // Minor issues
      D: 0.3, // Major issues
      E: 0.0, // Completely wrong
    },
  })(args);
}
