import { Eval } from 'braintrust';
import { ExtractAchievementScorer } from './scorers/extract-achievement-scorer';
import { renderExecute } from '../../extract-achievements';
import type {
  ExtractedAchievement,
  ExtractAchievementsPromptProps,
} from '../types';

import { companies, projects, user } from './data/user';

// Function to wrap the async generator into a promise
async function wrappedExtractAchievements(
  input: ExtractAchievementsPromptProps,
): Promise<ExtractedAchievement[]> {
  return await renderExecute(input);
}

const chatHistory = [
  {
    role: 'user' as const,
    parts: [
      {
        type: 'text' as const,
        text: 'I fixed several UX bugs in the checkout flow on Bragdoc today',
      },
    ],
    id: '1',
  },
];

const lastMidnight = new Date();
lastMidnight.setHours(0, 0, 0, 0);

const nextMidnight = new Date();
nextMidnight.setDate(nextMidnight.getDate() + 1);
nextMidnight.setHours(0, 0, 0, 0);

const experimentData: Experiment[] = [
  {
    input: {
      companies,
      projects,
      chatHistory,
      user,
      message: 'I fixed several UX bugs in the checkout flow on Bragdoc today',
    },
    expected: [
      {
        summary: 'Fixed several UX bugs in the checkout flow',
        details: 'Fixed several UX bugs in the checkout flow on Bragdoc',
        eventStart: lastMidnight,
        eventEnd: nextMidnight,
        impactSource: 'llm',
        impactUpdatedAt: new Date(),
        companyId: companies[0]!.id,
        projectId: projects[0]!.id,
        title: 'Fixed several UX bugs in the checkout flow',
        eventDuration: 'day',
        impact: 1,
      },
    ],
  },
];

Eval('extract-chat-achievements', {
  data: experimentData,
  task: wrappedExtractAchievements,
  scores: [ExtractAchievementScorer],
  trialCount: 3,
  metadata: {
    model: 'gpt-4',
    description: 'Evaluating achievement extraction',
    owner: 'ed',
  },
});

export type Experiment = {
  input: ExtractAchievementsPromptProps;
  expected: ExtractedAchievement[];
};
