import { openai } from '@ai-sdk/openai';
import { google } from '@ai-sdk/google';
import { experimental_wrapLanguageModel as wrapLanguageModel } from 'ai';
import { wrapAISDKModel } from 'braintrust';
import { createOpenRouter } from '@openrouter/ai-sdk-provider';
import { createDeepSeek } from '@ai-sdk/deepseek';

import { customMiddleware } from './custom-middleware';

export const defaultModel = 'gpt-4o';

export const customModel = (apiIdentifier: string = defaultModel, provider: any = openai) => {
  const wrappedModel = wrapLanguageModel({
    model: provider(apiIdentifier),
    middleware: customMiddleware,
  });

  return wrapAISDKModel(wrappedModel);
};

const openrouter = createOpenRouter({
  apiKey: process.env.OPENROUTER_API_KEY!,
});

const deepseek = createDeepSeek({
  apiKey: process.env.DEEPSEEK_API_KEY ?? '',
});

export const gpt35TurboModel = customModel('gpt-3.5-turbo');
export const gpt4Model = customModel('gpt-4');
export const gpt4oModel = customModel('gpt-4o');
export const gpt4oMiniModel = customModel('gpt-4o-mini');
export const geminiFlashModel = customModel('gemini-2-flash', google);
export const geminiFlashExpModel = customModel('google/gemini-2.0-flash-exp:free', openrouter);
export const deepseekV3Model = customModel('deepseek-chat', deepseek);

// export const myModel = customModel('openai/gpt-4o-mini', openrouter);

export const extractAchievementsModel = gpt4oModel;
export const chatModel = gpt4oModel;
export const findExistingProjectModel = gpt4oMiniModel;

export const documentWritingModel = gpt4oModel;