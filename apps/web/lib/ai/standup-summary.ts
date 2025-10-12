import { generateText } from 'ai';
import { routerModel } from './index';
import type { Achievement, User, StandupDocument } from '@bragdoc/database';

/**
 * Generate a standup summary from achievements
 * @param achievements List of achievements since last standup
 * @param instructions Optional custom instructions from user
 * @param user Optional user object for LLM selection
 * @returns Generated summary text
 */
export async function generateStandupAchievementsSummary(
  achievements: Achievement[],
  instructions?: string,
  user?: User
): Promise<string> {
  if (achievements.length === 0) {
    return 'No new achievements to report since the last standup.';
  }

  // Format achievements for the prompt
  const achievementsText = achievements
    .map(
      (achievement, index) =>
        `${index + 1}. ${achievement.title}${achievement.summary ? `\n   ${achievement.summary}` : ''}${achievement.impact ? `\n   Impact: ${achievement.impact}/10` : ''}`
    )
    .join('\n\n');

  // Build the prompt
  const systemPrompt = `You are a helpful assistant that creates concise standup summaries from Achievement data.
Achievements are specific accomplishments or impacts that the user (a software engineer) has achieved since the last standup.
Your task is to create a complete but concise summary of the achievements listed below to aid the user in the deliver of
their standup update.

You are NOT writing a script for the user to read verbatim. Rather, you are creating a structured update that reminds the user
about all of the Achievements they've made in the period since the last standup (all of these Achievements are listed below).

Your audience is the user, a software engineer who is preparing to give a standup update to their team.

Focus on the key accomplishments and their impact.
${instructions ? `\nAdditional instructions from user: ${instructions}` : ''}`;

  const userPrompt = `Here are the Achievements for this update:

${achievementsText}

Please create your complete and concise summary of the achievements listed above, per the instructions you have been given.

Instructions:

- Write in plain text, not in markdown.
- Do not write in my voice, you are writing a summary for me.
- Do not write a script, but a business-like summary of the work done
- Do not assess the value of the work done, just summarize it
- If an Achievement has a very high impact score (6 or above), highlight it in the summary, otherwise do not mention the impact score
- Group related Achievements together in a single paragraph
- Use bullet points where appropriate`;

  try {
    // Use the router model for generating summaries
    const model = routerModel;

    const { text } = await generateText({
      model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.7,
      maxTokens: 500,
    });

    return text.trim();
  } catch (error) {
    console.error('Error generating standup summary:', error);
    throw new Error('Failed to generate standup summary');
  }
}

/**
 * Generate a short summary for a standup document
 * Takes the achievements summary and WIP content and creates a one-line summary
 * Used for the document list view
 */
export async function generateStandupDocumentSummary(
  document: Pick<StandupDocument, 'achievementsSummary' | 'wip'>,
  user?: User
): Promise<string> {
  const { achievementsSummary, wip } = document;

  if (!achievementsSummary && !wip) {
    return 'No content available';
  }

  // Build the content string
  const content = [
    achievementsSummary && `Achievements: ${achievementsSummary}`,
    wip && `Work in Progress: ${wip}`,
  ]
    .filter(Boolean)
    .join('\n\n');

  // If content is already short, just return it
  if (content.length < 100) {
    return content;
  }

  try {
    const model = routerModel;

    const { text } = await generateText({
      model,
      messages: [
        {
          role: 'user',
          content: `Summarize this standup update in one short sentence (max 15 words):\n\n${content}`,
        },
      ],
      temperature: 0.5,
      maxTokens: 50,
    });

    return text.trim();
  } catch (error) {
    console.error('Error generating standup document summary:', error);
    // Fallback: just truncate the content
    return `${content.substring(0, 97)}...`;
  }
}
