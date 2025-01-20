'use client';

import React from 'react';
import {
  Prompt,
  Purpose,
  Instructions,
  Examples,
  InputFormat,
  UserInput,
  ChatHistory,
  Variables,
} from '../aisx';
import { formattedRender } from '../aisx/render';
import { Companies, Projects } from '../aisx/elements';
import { expectedAchievements as examples } from './evals/data/extract-achievements';
import { ExtractAchievementsPromptProps } from './types';

const instructions = [
  'Consider the chat history and context to understand the full scope of each achievement.',

  `Pay special attention to:
  1. Recent updates or progress reports
  2. Completed milestones or phases
  3. Team growth or leadership responsibilities
  4. Quantitative metrics or impact
  5. Technical implementations or solutions`,

  `Each achievement should have a clear, action-oriented title (REQUIRED) that:
  - Starts with an action verb (e.g., Led, Launched, Developed)
  - Includes specific metrics when possible (e.g., "40% reduction", "2x improvement")
  - Mentions specific systems or teams affected
  - Is between 10 and 256 characters
  Example good titles:
  - "Led Migration of 200+ Services to Cloud Platform"
  - "Reduced API Response Time by 40% through Caching"
  - "Grew Frontend Team from 5 to 12 Engineers"`,

  'Create a concise summary highlighting key metrics and impact. Do not add anything beyond what the user told you.',
  'Create a detailed description including context and significance. Do not add anything beyond what the user told you. Do not speculate',
  'If possible, include the event duration (day/week/month/quarter/half year/year)',
  'If the user is clearly indicating a specific company, provide the company ID (or null if none)',
  'If the user clearly indicated a specific project, but did not mention the company, provide the companyId from the project if it has one',
  'If the user is clearly indicating a specific project, provide the project ID (or null if none)',
  `Create an eventStart date if possible. If the user tells you they did something on a specific date, include it.`,
  'Create an eventEnd date if possible. If the user does not explicitly mention an end date, do not return one',

  `Impact rating (1-3) based on these criteria:,
   - Level 1 (Low): Routine tasks, individual/small team benefit, short-term impact
   - Level 2 (Medium): Notable improvements, team/department benefit, medium-term impact
   - Level 3 (High): Major initiatives, org-wide benefit, long-term strategic impact`,
  'Each Achievement should be complete and self-contained.',
  'If the user mentions multiple achievements in a single message, extract them all.',

  `Consider only the single message inside <user-input> when creating Achievements. If the user mentions achievements in the <chat-history>
you are given, you should not extract them because they have already been extracted. However, if those previous messages are relevant to the current
message, you should use them to inform your extraction.`,

  `Example good titles:
  - "Led Migration of 200+ Services to Cloud Platform"
  - "Reduced API Response Time by 40% through Caching"
  - "Grew Frontend Team from 5 to 12 Engineers"`,
];

export function ExtractAchievementsPrompt({
  companies,
  projects,
  message,
  chatHistory,
  user,
}: ExtractAchievementsPromptProps) {
  return (
    <Prompt>
      <Purpose>
        You are a careful and attentive assistant who extracts work achievements
        from conversations between users and AI assistants. Extract all of the
        achievements in the user message contained within the {`<user-input>`}
        tag. Follow all of the instructions provided below.
      </Purpose>
      <Instructions instructions={instructions} />
      <InputFormat>
        <user-input>
          The message that the user just sent you to extract achievements from
        </user-input>
        <chat-history>
          Recent chat history between the user and AI assistant
        </chat-history>
        <companies>
          All of the companies that the user works at (or has worked at)
        </companies>
        <projects>
          All of the projects that the user works on (or has worked on)
        </projects>
        <user-instructions>
          Any specific instructions from the user to guide the extraction
          process
        </user-instructions>
      </InputFormat>
      <Variables>
        <today>{new Date().toLocaleDateString()}</today>
        <user-instructions>
          {user.preferences.documentInstructions}
        </user-instructions>
        <ChatHistory messages={chatHistory} />
        <Companies companies={companies} />
        <Projects projects={projects} />
        <UserInput>{message}</UserInput>
      </Variables>
      <Examples examples={examples.map((e) => JSON.stringify(e, null, 4))} />
    </Prompt>
  );
}

export function renderExtractAchievementsPrompt(
  config: ExtractAchievementsPromptProps
) {
  return formattedRender(<ExtractAchievementsPrompt {...config} />);
}
