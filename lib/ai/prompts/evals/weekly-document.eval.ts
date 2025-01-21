import { Eval } from 'braintrust';
import { generateDocument} from '@/lib/ai/generate-document';
import { DocumentScorer } from './scorers/document-scorer';

const createDocument = async (input: any): Promise<string> => {
  const { fullStream } = await generateDocument(input);
  let docText = '';

  for await (const delta of fullStream) {
    const { type } = delta;

    if (type === 'text-delta') {
      const { textDelta } = delta;

      docText += textDelta;
    }
  }

  return docText;
}



import type { DocumentPromptData } from '@/lib/ai/generate-document';

export type Experiment = {
  input: DocumentPromptData;
}

import { renderCompanies, renderProjects, renderMessage } from '@/lib/ai/renderers';

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
  createdAt: new Date('2023-01-01'),
  updatedAt: new Date('2023-01-01'),
  userId: '1234',
  repoRemoteUrl: null
}

export const user = {
  name: 'Ed Spencer',
  preferences: {
    documentInstructions: 'Always use the title "Weekly Summary"',
    language: 'en',
    hasSeenWelcome: true
  },
  id: '1234',
  email: 'Q3Sd2@example.com',
};

export const chatHistory: any[] = [];

export const experimentData: Experiment[] = [
  {
    input: {
      title: 'Specific Doc name requested by user',
      days: 7,

      user,

      //assuming the document was generated via chat UI
      chatHistory,

      chatStr: chatHistory.map(renderMessage).join('\n'),

      // From user.documentInstructions
      userInstructions: `For weekly documents, always use the title "Weekly Summary"`,

      //if the user was clearly talking about a specific project,
      //this will be provided now
      project,
      projectsStr: renderProjects([project]),

      //if there is a project, and the project has a company,
  //this will be provided now
      company,
      companiesStr: renderCompanies([company]),

      achievements: [
        //any achievements that were found for the request

        {
          id: '1',
          title: 'Implemented feature',
          summary: 'Implemented feature X on project X',
          impact: 1,
          eventDuration: 'day',
          eventStart: new Date('2023-02-01'),
        },
        {
          id: '2',
          title: 'Debugged bug',
          summary: 'Found and fixed a login-related bug on project X',
          impact: 2,
          eventDuration: 'day',
          eventStart: new Date('2023-02-02'),
        },
        {
          id: '3',
          title: 'Tested feature',
          summary: 'Tested feature X on project X',
          impact: 1,
          eventDuration: 'day',
          eventStart: new Date('2023-02-03'),
        },
        {
          id: '4',
          title: 'Refactored code',
          summary: 'Refactored a section of the codebase for project X',
          impact: 1,
          eventDuration: 'day',
          eventStart: new Date('2023-02-04'),
        },
        {
          id: '5',
          title: 'Documented code',
          summary: 'Wrote unit tests for feature X on project X',
          impact: 1,
          eventDuration: 'day',
          eventStart: new Date('2023-02-05'),
        },
        {
          id: '6',
          title: 'Researched',
          summary: 'Spent a few hours researching options for feature Y on project X',
          impact: 1,
          eventDuration: 'day',
          eventStart: new Date('2023-02-06'),
        },
      ]
    }
  }
]


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