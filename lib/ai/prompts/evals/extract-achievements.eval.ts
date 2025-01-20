import { Eval } from 'braintrust';
import { ExtractAchievementScorer } from './scorers/extract-achievement-scorer';
import { extractAchievements } from '../../extract-achievements';
import {
  ExtractedAchievement,
  ExtractAchievementsPromptProps,
} from '../types';

// Function to wrap the async generator into a promise
async function wrappedExtractAchievements(
  input: ExtractAchievementsPromptProps
): Promise<ExtractedAchievement[]> {
  const achievements = await extractAchievements(input);

  return achievements;
}

const chatHistory = [
  {
    role: 'user' as const,
    content: 'I worked on Project A at Company A',
    id: '1',
  },
];

import { companies, projects, user } from './data/user';

const experimentData: Experiment[] = [
  {
    input: {
      companies,
      projects,
      chatHistory,
      user,
      message: 'I worked on Project A at Company A',
    },
    expected: [
      {
        summary: 'Worked on Project A at Company A',
        details: 'Worked on Project A at Company A',
        eventStart: new Date(),
        eventEnd: new Date(),
        impactSource: 'llm',
        impactUpdatedAt: new Date(),
        companyId: companies[0].id,
        projectId: projects[0].id,
        title: 'Worked on Project A at Company A',
        eventDuration: 'day',
        impact: 1,
      },
    ],
  },
];

Eval('extract-achievement-company-and-project', {
  data: experimentData,
  task: wrappedExtractAchievements,
  scores: [ExtractAchievementScorer],
  trialCount: 3,
  metadata: {
    model: 'gpt-4',
    description:
      'Evaluating achievement extraction with company and project context',
    owner: 'ed',
  },
});

type Experiment = {
  input: ExtractAchievementsPromptProps;
  expected: ExtractedAchievement[];
};
