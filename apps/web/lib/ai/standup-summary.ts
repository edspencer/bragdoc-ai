import { generateText } from 'ai';
import { routerModel } from './index';
import type { Achievement, User } from '@bragdoc/database';

/**
 * Generate a standup summary from achievements
 * @param achievements List of achievements since last standup
 * @param instructions Optional custom instructions from user
 * @param user Optional user object for LLM selection
 * @returns Generated summary text
 */
export async function generateStandupSummary(
  achievements: Achievement[],
  instructions?: string,
  user?: User,
): Promise<string> {
  if (achievements.length === 0) {
    return 'No new achievements to report since the last standup.';
  }

  // Format achievements for the prompt
  const achievementsText = achievements
    .map(
      (achievement, index) =>
        `${index + 1}. ${achievement.title}${achievement.summary ? `\n   ${achievement.summary}` : ''}${achievement.impact ? `\n   Impact: ${achievement.impact}/10` : ''}`,
    )
    .join('\n\n');

  // Build the prompt
  const systemPrompt = `You are a helpful assistant that creates concise standup summaries from achievement data.
Your goal is to summarize what the user accomplished in a clear, professional manner suitable for a team standup meeting.
Focus on the key accomplishments and their impact.
${instructions ? `\nAdditional instructions from user: ${instructions}` : ''}`;

  const userPrompt = `Please create a standup summary from these achievements:

${achievementsText}

Create a concise summary (2-4 paragraphs) that:
1. Highlights the most important accomplishments
2. Mentions any significant impact or results
3. Is suitable for sharing in a team standup meeting
4. Uses a professional but friendly tone`;

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
 * Generate a quick one-line summary from a longer summary
 * Used for the document list view
 */
export async function generateQuickSummary(
  fullSummary: string,
  user?: User,
): Promise<string> {
  if (!fullSummary || fullSummary.length === 0) {
    return 'No summary available';
  }

  // If summary is already short, just return it
  if (fullSummary.length < 100) {
    return fullSummary;
  }

  try {
    const model = routerModel;

    const { text } = await generateText({
      model,
      messages: [
        {
          role: 'user',
          content: `Summarize this standup update in one short sentence (max 15 words):\n\n${fullSummary}`,
        },
      ],
      temperature: 0.5,
      maxTokens: 50,
    });

    return text.trim();
  } catch (error) {
    console.error('Error generating quick summary:', error);
    // Fallback: just truncate the full summary
    return `${fullSummary.substring(0, 97)}...`;
  }
}
