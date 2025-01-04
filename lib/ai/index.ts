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
