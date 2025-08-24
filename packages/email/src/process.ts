import {
  createUserMessage,
  getUser,
  getCompaniesByUserId,
  getAchievements,
  createAchievement,
} from '@bragdoc/database';
import { getProjectsByUserId } from '@bragdoc/database';
// TODO: Move AI functions to shared package to avoid circular dependencies
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';

export interface IncomingEmail {
  from: string;
  subject: string;
  textContent: string;
  htmlContent?: string;
}

// Extract email from "From" header (e.g. "John Doe <john@example.com>" -> "john@example.com")
function extractEmailFromSender(from: string): string {
  const match = from.match(/<(.+?)>/);
  if (match && match[1]) return match[1];
  return from;
}

const systemPrompt = `
You are BragDoc AI, an AI assistant that helps users track their professional achievements.
You are given the contents of all emails that are sent to hello@bragdoc.ai.
If the message came from an active user, you will be told about the user.
You have received an email that may contain achievements. Your task is to analyze the email content and identify any achievements that should be saved.

If you identify any achievements, use the extractAchievements tool to extract them. Only call this tool once, even if multiple achievements are found.
Do not pass any content to the extractAchievements tool. It already has access to the email content.

Remember:
- Focus on professional achievements and accomplishments
- Look for concrete results, impacts, and outcomes
- Consider both major and minor achievements
- If no achievements are found, do not call the extractAchievements tool`;

export async function processIncomingEmail(
  email: IncomingEmail
): Promise<{ success: boolean; error?: string }> {
  try {
    const senderEmail = extractEmailFromSender(email.from);

    // Look up the user by email
    const [user] = await getUser(senderEmail);

    if (!user) {
      console.log(`Ignoring email from unknown sender: ${senderEmail}`);
      return { success: true };
    }

    // Get user's context
    const [companies, projects, { achievements }] = await Promise.all([
      getCompaniesByUserId({ userId: user.id }),
      getProjectsByUserId(user.id),
      getAchievements({
        userId: user.id,
        startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
        limit: 50,
      }),
    ]);

    console.log('Asking the LLM about what kind of email this is...');

    // Build context for the LLM
    const userContext = `
User Information:
- Name: ${user.name || 'Unknown'}
- Email: ${user.email}

Companies (${companies.length}):
${companies.map((c) => `- ${c.name}`).join('\n')}

Projects (${projects.length}):
${projects.map((p) => `- ${p.name} (${p.company?.name || 'No Company'})`).join('\n')}

Recent Achievements (${achievements.length}):
${achievements.map((a) => `- ${a.title}`).join('\n')}`;

    // TODO: Implement AI-powered achievement extraction
    // For now, just log the email and return success
    console.log('Processed email from:', senderEmail);
    console.log('Email subject:', email.subject);
    console.log('Email content length:', email.textContent.length);
    
    // In a future update, this should:
    // 1. Use AI to analyze the email content
    // 2. Extract achievements automatically
    // 3. Save them to the database
    console.log('AI processing temporarily disabled - email logged only');

    return { success: true };
  } catch (error) {
    console.error('Error processing email:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
