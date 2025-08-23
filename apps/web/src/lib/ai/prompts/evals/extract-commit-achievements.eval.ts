import { Eval } from 'braintrust';
import { ExtractAchievementScorer } from './scorers/extract-achievement-scorer';
import { renderExecute } from '../../extract-commit-achievements';
import type {
  ExtractedAchievement,
  ExtractCommitAchievementsPromptProps,
} from '../types';
import { companies, projects, user } from './data/user';
import {repository, noisyCommits, qualityCommits, expectedAchievementsFromNoisyCommits, expectedAchievementsFromQualityCommits} from './data/extract-commit-achievements';

// Function to wrap the async generator into a promise
async function wrappedExtractCommitAchievements(
  input: ExtractCommitAchievementsPromptProps
): Promise<ExtractedAchievement[]> {
  return await renderExecute(input);
}

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
      commits: noisyCommits,
      repository,
      user
    },
    expected: expectedAchievementsFromNoisyCommits,
  },
  {
    input: {
      companies,
      projects,
      commits: qualityCommits,
      repository,
      user
    },
    expected: expectedAchievementsFromQualityCommits
  },
];

Eval('extract-commit-achievements', {
  data: experimentData,
  task: wrappedExtractCommitAchievements,
  scores: [ExtractAchievementScorer],
  trialCount: 3,
  metadata: {
    model: 'gpt-4',
    description:
      'Evaluating achievement extraction with company and project context',
    owner: 'ed',
  },
});

export type Experiment = {
  input: ExtractCommitAchievementsPromptProps;
  expected: ExtractedAchievement[];
};
