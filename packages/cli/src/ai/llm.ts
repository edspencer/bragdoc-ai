import { openai } from '@ai-sdk/openai';

/**
 * Configure the LLM for achievement extraction
 * Uses OpenAI's GPT-4o model for high-quality extraction
 *
 * Note: Requires OPENAI_API_KEY environment variable to be set
 */
export const extractAchievementsModel = openai('gpt-4o');
