import { openai } from '@ai-sdk/openai';
import { experimental_wrapLanguageModel as wrapLanguageModel } from 'ai';

import { customMiddleware } from './custom-middleware';

export const defaultModel = 'gpt-4o';

export const customModel = (apiIdentifier: string = defaultModel) => {
  return wrapLanguageModel({
    model: openai(apiIdentifier),
    middleware: customMiddleware,
  });
};

export const extractAchievementsModel = customModel('gpt-4o-mini');
export const chatModel = customModel('gpt-4o');
export const findExistingProjectModel = customModel('gpt-4o-mini');

// import { google } from '@ai-sdk/google';
    // model: customModel("gpt-4o"),
    // model: google('gemini-2-flash'),
    // model: google('gemini-2.0-flash-exp'),