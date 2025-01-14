import { openai } from '@ai-sdk/openai';
import { google } from '@ai-sdk/google';
import { experimental_wrapLanguageModel as wrapLanguageModel } from 'ai';
import { wrapAISDKModel } from 'braintrust';

import { customMiddleware } from './custom-middleware';

export const defaultModel = 'gpt-4o';

export const customModel = (apiIdentifier: string = defaultModel, provider: any = openai) => {
  const wrappedModel = wrapLanguageModel({
    model: provider(apiIdentifier),
    middleware: customMiddleware,
  });

  return wrapAISDKModel(wrappedModel);
};

export const gpt35TurboModel = customModel('gpt-3.5-turbo');
export const gpt4Model = customModel('gpt-4');
export const gpt4oModel = customModel('gpt-4o');
export const gpt4oMiniModel = customModel('gpt-4o-mini');
export const geminiFlashModel = customModel('gemini-2-flash', google);
export const geminiFlashExpModel = customModel('gemini-2.0-flash-exp', google);

export const extractAchievementsModel = gpt4oMiniModel;
export const chatModel = gpt4oModel;
export const findExistingProjectModel = gpt4oMiniModel;

export const documentWritingModel = gpt4oModel;