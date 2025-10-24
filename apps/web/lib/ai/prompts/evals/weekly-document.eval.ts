import { Eval } from 'braintrust';
import { renderExecute } from 'lib/ai/generate-document';
import { DocumentScorer } from './scorers/document-scorer';

const createDocument = async (input: any): Promise<string> => {
  const { fullStream } = await renderExecute(input);
  let docText = '';

  for await (const delta of fullStream) {
    const { type } = delta;

    if (type === 'text-delta') {
      const { text: textDelta } = delta;

      docText += textDelta;
    }
  }

  return docText;
};

import type { GenerateDocumentPromptProps } from 'lib/ai/prompts/types';

export type Experiment = {
  input: GenerateDocumentPromptProps;
};

import { existingAchievements } from './data/weekly-document-achievements';

export const company = {
  name: 'Acme Corp',
  id: '1234',
  startDate: new Date('2023-01-01'),
  endDate: new Date('2023-01-01'),
  userId: '1234',
  role: 'Engineer',
  domain: 'www.boo.com',
};

export const project = {
  name: 'Project X',
  description: 'Description of Project X',
  startDate: new Date('2023-01-01'),
  endDate: new Date('2023-06-30'),
  id: '1234',
  companyId: '1234',
  status: 'active',
  color: '#3B82F6',
  createdAt: new Date('2023-01-01'),
  updatedAt: new Date('2023-01-01'),
  userId: '1234',
  repoRemoteUrl: null,
};

export const user = {
  name: 'Ed Spencer',
  preferences: {
    documentInstructions: 'Always use the title "Weekly Summary"',
    language: 'en',
  },
  id: '1234',
  email: 'Q3Sd2@example.com',
};

export const chatHistory: any[] = [];

export const experimentData: Experiment[] = [
  {
    input: {
      docTitle: 'Specific Doc name requested by user',
      days: 7,

      user,

      //assuming the document was generated via chat UI
      chatHistory,

      // From user.documentInstructions
      userInstructions: `For weekly documents, always use the title "Weekly Summary"`,

      //if the user was clearly talking about a specific project,
      //this will be provided now
      project,

      //if there is a project, and the project has a company,
      //this will be provided now
      company,

      achievements: existingAchievements,
    },
  },
];

// Create the evaluation
Eval('weekly-document-generation', {
  data: experimentData,
  task: createDocument,
  scores: [DocumentScorer],
  trialCount: 3,
  metadata: {
    model: 'gpt-4',
    description:
      'Evaluating achievement extraction with company and project context',
    owner: 'ed',
  },
});
