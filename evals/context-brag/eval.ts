import { Eval } from 'braintrust';
import { LLMClassifierFromSpec, type Score } from 'autoevals';
import { contextAchievementExamples } from './dataset';
import { extractAchievements } from '../../lib/ai/extract';
import type { ContextAchievementExample } from './types';
import type {
  ExtractedAchievement,
  ExtractAchievementsInput,
} from '../../lib/ai/extract';
import type { CompanyContext, ProjectContext } from '../conversation-gen';


const mapAchievementsToString = (achievements: ExtractedAchievement[]) => {
  return achievements
    .map(
      (achievement, index) => `
Achievement #${index + 1}:
Title: ${achievement.title}
Summary: ${achievement.summary}
Details: ${achievement.details}
Duration: ${achievement.eventDuration}
Company ID: ${achievement.companyId}
Project ID: ${achievement.projectId}
Suggest New Project: ${achievement.suggestNewProject}
      `,
    )
    .join('\n');
};

const mapCompaniesToString = (companies: CompanyContext[]) => {
  return companies
    .map(
      (company) => `
Name: ${company.name} (ID: ${company.id})
Role: ${company.role}
Domain: ${company.domain || 'N/A'}
Start Date: ${company.startDate}
End Date: ${company.endDate || 'Present'}
      `,
    )
    .join('\n');
};

const mapProjectsToString = (projects: ProjectContext[]) => {
  return projects
    .map(
      (project) => `
Name: ${project.name} (ID: ${project.id})
Company: ${project.companyId || 'N/A'}
Description: ${project.description}
Start Date: ${project.startDate || 'N/A'}
End Date: ${project.endDate || 'N/A'}
      `,
    )
    .join('\n');
};

// Convert our examples to the format expected by BrainTrust
const experimentData = contextAchievementExamples.map(
  (example: ContextAchievementExample) => ({
    input: {
      ...example.input,
      chatStr: example.input.chat_history
        .map(({ role, content }) => `${role}: ${content}`)
        .join('\n'),
      companiesStr: mapCompaniesToString(example.input.context.companies),
      projectsStr: mapProjectsToString(example.input.context.projects),
      expectedAchievementsStr: mapAchievementsToString(example.expected)
    },
    expected: example.expected,
  }),
);

// Function to evaluate the accuracy of extracted achievements with context
const AchievementContextAccuracy = LLMClassifierFromSpec(
  'AchievementContextAccuracy',
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

async function AchievementFactualityScorer(args: any): Promise<Score> {
  args.outputFormatted = mapAchievementsToString(args.output);

  return AchievementContextAccuracy(args);
}


// Function to wrap the async generator into a promise
async function wrappedExtractAchievements(
  input: ExtractAchievementsInput,
): Promise<ExtractedAchievement[]> {
  const achievements: ExtractedAchievement[] = [];
  for await (const achievement of extractAchievements(input)) {
    achievements.push(achievement);
  }

  return achievements;
}

// Create the evaluation
Eval('extract-achievement-company-and-project', {
  data: experimentData,
  task: wrappedExtractAchievements,
  scores: [AchievementFactualityScorer],
  trialCount: 3,
  metadata: {
    model: 'gpt-4',
    description:
      'Evaluating achievement extraction with company and project context',
    owner: 'ed',
  },
});
