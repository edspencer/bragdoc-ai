import { Eval } from 'braintrust';
import { ExtractAchievementScorer } from './scorers/extract-achievement-scorer';
import { extractAchievements } from '../../extract-achievements';
import type {
  ExtractedAchievement,
  ExtractAchievementsPromptProps,
} from '../types';

// Function to wrap the async generator into a promise
async function wrappedExtractAchievements(
  input: ExtractAchievementsPromptProps
): Promise<ExtractedAchievement[]> {
  return await extractAchievements(input);
}

//we should be extracting 4 Achievements out of this - 2 from each paragraph
const followupBrag = `
I added the Documents CRUD pages for logged in users today - so a user can see all of the documents that they've created,
and edit them without having to go back through the chat. Also I removed the Github Repo management UI files as it was vestigial
at this point and wasn't even being included anywhere.

I implemented the new homepage design and tested out the Stripe integration in production. I also updated the README in
the BragDoc repo to make it easier for new developers to get up and running.
`;

const chatHistory = [
  {
    role: 'user' as const,
    content: 'I fixed several UX bugs in the checkout flow on Bragdoc today',
    id: '1',
  },
  {
    role: 'assistant' as const,
    content: 'Ok, I\'ve recorded your process achievement. Would you like to add any additional context about the impact or process?',
    id: '2',
  },
  {
    role: 'user' as const,
    content: followupBrag,
    id: '3',
  },
];

import { companies, projects, user } from './data/user';

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
      message: followupBrag
    },
    expected: [
      {
        summary: 'Added the Documents CRUD pages for logged in users',
        details: 'Added the Documents CRUD pages for logged in users - so a user can see all of the documents that they\'ve created, and edit them without having to go back through the chat',
        eventStart: lastMidnight,
        eventEnd: nextMidnight,
        impactSource: 'llm',
        impactUpdatedAt: new Date(),
        companyId: companies[0].id,
        projectId: projects[0].id,
        title: 'Added the Documents CRUD pages for logged in users',
        eventDuration: 'day',
        impact: 1,
      },
      {
        summary: 'Removed the Github Repo management UI',
        details: 'Removed the Github Repo management UI as it was vestigial at this point',
        eventStart: lastMidnight,
        eventEnd: nextMidnight,
        impactSource: 'llm',
        impactUpdatedAt: new Date(),
        companyId: companies[0].id,
        projectId: projects[0].id,
        title: 'Removed the Github Repo management UI',
        eventDuration: 'day',
        impact: 3,
      },
      {
        summary: 'Implemented the new homepage design',
        details: 'Implemented the new homepage design and tested out the Stripe integration in production',
        eventStart: lastMidnight,
        eventEnd: nextMidnight,
        impactSource: 'llm',
        impactUpdatedAt: new Date(),
        companyId: companies[0].id,
        projectId: projects[0].id,
        title: 'Implemented the new homepage design',
        eventDuration: 'day',
        impact: 2,
      },
      {
        summary: 'Updated the README in the BragDoc repo',
        details: 'Updated the README in the BragDoc repo to make it easier for new developers to get up and running',
        eventStart: lastMidnight,
        eventEnd: nextMidnight,
        impactSource: 'llm',
        impactUpdatedAt: new Date(),
        companyId: companies[0].id,
        projectId: projects[0].id,
        title: 'Updated the README in the BragDoc repo',
        eventDuration: 'day',
        impact: 2,
      },
    ],
  },
];

Eval('extract-later-achievements', {
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

export type Experiment = {
  input: ExtractAchievementsPromptProps;
  expected: ExtractedAchievement[];
};
