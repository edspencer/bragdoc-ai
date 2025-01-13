import { Eval } from 'braintrust';
import { LLMClassifierFromSpec, type Score } from 'autoevals';
import { DocumentPromptData, generateDocument, renderCompany, renderProject, preparePromptData, PreparePromptDataArgs, renderMessage } from '@/lib/ai/generate-document';
import { Achievement, Company, Message, Project } from '@/lib/db/schema';

// Function to evaluate the accuracy of extracted achievements with context
const DocumentAccuracy = LLMClassifierFromSpec(
  'DocumentAccuracy',
  {
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
  },
);

async function DocumentScorer(args: any): Promise<Score> {


  return DocumentAccuracy(args);
}




type Experiment = {
  input: DocumentPromptData;
}

const company: Company = {
  name: 'Acme Corp',
  id: '1234',
  startDate: new Date('2023-01-01'),
  endDate: new Date('2023-01-01'),
  userId: '1234',
  role: 'Engineer',
  domain: 'www.boo.com',
};

const project: Project = {
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

const user = {
  name: 'Ed Spencer',
  preferences: {
    documentInstructions: 'Always use the title "Weekly Summary"',
    language: 'en',
    hasSeenWelcome: true
  },
  id: '1234',
  email: 'Q3Sd2@example.com',

};

const chatHistory: Message[] = [];

const experimentData: Experiment[] = [
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
      projectsStr: renderProject(project),

      //if there is a project, and the project has a company,
  //this will be provided now
      company,
      companiesStr: renderCompany(company),

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
