import { Eval } from 'braintrust';
import { LLMClassifierFromSpec, type Score } from 'autoevals';
import { extractAchievements } from '../../lib/ai/extract';
import type {
  ExtractedAchievement,
  ExtractAchievementsInput,
} from '../../lib/ai/extract';


// // Convert our examples to the format expected by BrainTrust
// const experimentData = contextAchievementExamples.map(
//   (example: ContextAchievementExample) => ({
//     input: {
//       ...example.input,
//       chatStr: example.input.chat_history
//         .map(({ role, content }) => `${role}: ${content}`)
//         .join('\n'),
//       expectedAchievementsStr: mapAchievementsToString(example.expected)
//     },
//     expected: example.expected,
//   }),
// );

// Function to evaluate the accuracy of extracted achievements with context
const DocumentAccuracy = LLMClassifierFromSpec(
  'DocumentAccuracy',
  {
    prompt: `You are evaluating how well an AI system extracted achievements from a user message.
Compare the extracted achievements with the expected output. Consider that a single message may 
contain multiple achievements.

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
[Expected Achievements]: 
{{{input.expectedAchievementsStr}}}

************
[Extracted Achievements]:
{{{outputFormatted}}}

************
[END DATA]

Compare the extracted achievements with the expected output. Consider:
1. Did the system extract all achievements mentioned in the message?
2. Are the titles clear and action-oriented?
3. Do the summaries capture key metrics and impact?
4. Are the details comprehensive and contextual?
5. Is the duration appropriate for each achievement?
6. Are company and project IDs correctly matched?
7. Is the suggestNewProject flag appropriate given the context?

Answer by selecting one of the following options:
(A) The extraction matches the expected output perfectly
(B) The extraction captures the main achievement but misses some details
(C) The extraction has minor inaccuracies but is generally correct
(D) The extraction misses key information or has significant inaccuracies
(E) The extraction is completely incorrect or misunderstands the achievement`,
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
  args.outputFormatted = mapAchievementsToString(args.output);

  return DocumentAccuracy(args);
}

const experimentData = [
  {
    input: {
      name: 'Specific Doc name requested by user',
      days: 7,

      user: {
        name: 'Ed Spencer',
      },

      //assuming the document was generated via chat UI
      chatHistory: [

      ],

      // From user.documentInstructions
      userInstructions: `For weekly documents, always use the title "Weekly Summary"`,

      project: {
        //if the user was clearly talking about a specific project,
        //this will be provided now
      },

      company: {
        //if there is a project, and the project has a company,
        //this will be provided now
      },

      achievements: [
        //any achievements that were found for the request
      ]
    },
    expected: {
      
    }
  }
]




// Create the evaluation
Eval('weekly-document-generation', {
  data: experimentData,
  task: wrappedExtractAchievements,
  scores: [DocumentScorer],
  trialCount: 3,
  metadata: {
    model: 'gpt-4',
    description:
      'Evaluating achievement extraction with company and project context',
    owner: 'ed',
  },
});
