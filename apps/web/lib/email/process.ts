import {
  createUserMessage,
  getUser,
  getCompaniesByUserId,
  getAchievements,
  createAchievement,
} from '@/database/queries';
import { getProjectsByUserId } from '@/database/projects/queries';
import { streamFetchRenderExecute } from '@/lib/ai/extract-achievements';
import { generateText, stepCountIs } from 'ai';
import { customModel } from '@/lib/ai';
import { z } from 'zod/v3';
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
  if (match) return match[1]!;
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
  email: IncomingEmail,
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

    // First, use LLM to determine if we should extract achievements
    const { text } = await generateText({
      model: customModel('gpt-4o-mini'),
      system: systemPrompt,

      messages: [
        {
          role: 'system',
          content: userContext,
        },
        {
          role: 'user',
          content: email.textContent,
        },
      ],

      stopWhen: stepCountIs(10),

      tools: {
        extractAchievements: {
          description:
            'Saves detected achievements to the database. Takes no parameters. Only call once.',
          inputSchema: z.object({}),
          execute: async () => {
            console.log(
              'Starting achievement extraction for email from:',
              senderEmail,
            );

            // Create a user message record first
            const [newUserMessage] = await createUserMessage({
              userId: user.id,
              originalText: email.textContent,
            });

            console.log('Created user message:', newUserMessage!.id);

            // Extract achievements using the AI
            const achievementsStream = streamFetchRenderExecute({
              message: email.textContent,
              chatHistory: [
                {
                  role: 'user',
                  parts: [{ type: 'text' as const, text: email.textContent }],
                  id: uuidv4(),
                },
              ],
              user,
            });

            const savedAchievements = [];

            // Process each achievement as it comes in
            for await (const achievement of achievementsStream) {
              console.log('Processing achievement:', achievement.title);

              try {
                const [savedAchievement] = await createAchievement({
                  userId: user.id,
                  userMessageId: newUserMessage!.id,
                  title: achievement.title,
                  summary: achievement.summary,
                  details: achievement.details,
                  eventDuration: achievement.eventDuration,
                  eventStart: achievement.eventStart || null,
                  eventEnd: achievement.eventEnd || null,
                  companyId: achievement.companyId,
                  projectId: achievement.projectId,
                  impact: achievement.impact,
                });

                console.log('Saved achievement:', savedAchievement!.id);
                savedAchievements.push(savedAchievement!);
              } catch (error) {
                console.error('Error saving achievement:', error);
                throw error;
              }
            }

            console.log(
              'Finished processing achievements:',
              savedAchievements.length,
            );
            return { success: true };
          },
        },
      },
    });

    console.log('Processed email from:', senderEmail);
    console.log('LLM response:', text);

    return { success: true };
  } catch (error) {
    console.error('Error processing email:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
