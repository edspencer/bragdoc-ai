import { openai } from '@ai-sdk/openai';
import type { LanguageModel } from 'ai';

export const defaultModel = 'gpt-4o-mini';

export const customModel = (
  apiIdentifier: string = defaultModel,
  provider: any = openai,
): LanguageModel => {
  // Temporarily bypass middleware and Braintrust for v5 compatibility
  return provider(apiIdentifier);

  // TODO: Re-enable when middleware and Braintrust support v5
  // const wrappedModel = wrapLanguageModel({
  //   model: provider(apiIdentifier),
  //   middleware: customMiddleware,
  // });
  // return wrapAISDKModel(wrappedModel);
};

export const gpt35TurboModel = customModel('gpt-3.5-turbo');
export const gpt4Model = customModel('gpt-4');
export const gpt4oModel: LanguageModel = openai('gpt-4o');
export const gpt4oMiniModel = customModel('gpt-4o-mini');
export const gpt41MiniModel: LanguageModel = openai('gpt-4.1-mini');

export const extractAchievementsModel = gpt4oMiniModel;
export const chatModel: LanguageModel = gpt4oModel;
export const findExistingProjectModel = gpt4oMiniModel;

export const documentWritingModel: LanguageModel = gpt41MiniModel;
export const routerModel: LanguageModel = gpt4oMiniModel;

/**
 * Get appropriate LLM for a specific task
 * @param taskType - Type of task: 'extraction', 'generation', or 'chat'
 * @returns Selected language model
 */
export function getLLM(
  taskType: 'extraction' | 'generation' | 'chat' = 'generation',
): LanguageModel {
  switch (taskType) {
    case 'extraction':
      return extractAchievementsModel;
    case 'generation':
      return documentWritingModel;
    case 'chat':
      return chatModel;
    default:
      return documentWritingModel;
  }
}
