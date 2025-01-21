import React from 'react';
import { LLMClassifierFromSpec, type Score } from 'autoevals';

import {
  Prompt,
  Purpose,
  Instructions,
  InputFormat,
  OutputFormat,
  Variables,
  formattedRender,
} from 'jsx-prompt';

import { Companies, Projects } from '../../elements';

import { companies, projects } from '../data/user';

const outputFormat = `
Answer by selecting one of the following options:
(A) The extraction matches the expected output perfectly
(B) The extraction captures the main achievement but misses some details
(C) The extraction has minor inaccuracies but is generally correct
(D) The extraction misses key information or has significant inaccuracies
(E) The extraction is completely incorrect or misunderstands the achievement`;

const instructions = [
  `
Compare the extracted achievements with the expected output. Consider:
1. Did the system extract all achievements mentioned in the message?
2. Are the titles clear and action-oriented?
3. Do the summaries capture key metrics and impact?
4. Are the details comprehensive and contextual?
5. Is the duration appropriate for each achievement?
6. Are company and project IDs correctly matched?
7. Is the suggestNewProject flag appropriate given the context?
`,
  `Evaluate Document Structure and Format
   - Does it follow user's language and formatting preferences?
   - Are achievements properly organized and grouped?`,
  `Evaluate Content Quality
   - Are achievements clearly and professionally described?
   - Are impact metrics and key results highlighted?
   - Is the content free of unnecessary fluff or exaggeration?`,
  `Evaluate Context Awareness
   - Does the document appropriately respond to the chat history context?
   - Are company and project references used appropriately?`,
  outputFormat,
];

function EvaluateExtractedAchievementsPrompt() {
  return (
    <Prompt>
      <Purpose>
        You are evaluating how well an AI system extracted achievements from a
        user message. Compare the extracted achievements with the expected
        output. Consider that a single message may contain multiple
        achievements. Return one of the scores defined below.
      </Purpose>
      <Instructions instructions={instructions} />
      <InputFormat>
        <user-input>
          The message that the user just sent you to extract achievements from
        </user-input>
        <companies>
          All of the companies that the user works at (or has worked at)
        </companies>
        <projects>
          All of the projects that the user works on (or has worked on)
        </projects>
      </InputFormat>
      <OutputFormat format={outputFormat} />
      <Variables>
        <Companies companies={companies} />
        <Projects projects={projects} />
      </Variables>
    </Prompt>
  );
}

export async function ExtractAchievementScorer(args: any): Promise<Score> {
  const prompt = formattedRender(<EvaluateExtractedAchievementsPrompt />);

  return LLMClassifierFromSpec('ExtractAchievementScorer', {
    prompt,
    choice_scores: {
      A: 1.0, // Perfect match
      B: 0.8, // Good but missing details
      C: 0.6, // Minor issues
      D: 0.3, // Major issues
      E: 0.0, // Completely wrong
    },
  })(args);
}
