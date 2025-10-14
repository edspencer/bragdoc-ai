import { openai } from '@ai-sdk/openai';
import { wrapLanguageModel, type LanguageModel } from 'ai';
import { wrapAISDKModel } from 'braintrust';

import { customMiddleware } from './custom-middleware';

export const defaultModel = 'gpt-4o-mini';

export const customModel = (
  apiIdentifier: string = defaultModel,
  provider: any = openai
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

export const extractAchievementsModel = gpt4oMiniModel;
export const chatModel: LanguageModel = gpt4oModel;
export const findExistingProjectModel = gpt4oMiniModel;

export const documentWritingModel: LanguageModel = gpt4oModel;
export const routerModel: LanguageModel = gpt4oMiniModel;
