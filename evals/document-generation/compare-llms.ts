import { Eval } from 'braintrust';
import { generateDocument} from '@/lib/ai/generate-document';
import { DocumentScorer } from './scorers';
import { experimentData } from './dataset';
import { gpt35TurboModel, gpt4Model, gpt4oModel, gpt4oMiniModel, geminiFlashModel, geminiFlashExpModel } from '@/lib/ai';
import type { LanguageModelV1 } from 'ai';

const createDocument = async (input: any, model: LanguageModelV1): Promise<string> => {
  const { fullStream } = await generateDocument(input, {model});
  let docText = '';

  for await (const delta of fullStream) {
    const { type } = delta;

    if (type === 'text-delta') {
      const { textDelta } = delta;

      docText += textDelta;
    }
  }

  return docText;
}
  

const models = {
  'gpt-3.5-turbo': gpt35TurboModel,
  'gpt-4': gpt4Model,
  'gpt-4o': gpt4oModel, 
  'gpt-4o-mini': gpt4oMiniModel,
  'gemini-2-flash': geminiFlashModel,
  'gemini-2.0-flash-exp': geminiFlashExpModel
}

async function runAll() {
  await Promise.all(
    Object.keys(models).map(async (modelName) => {
      // console.log(`Evaluating ${modelName}`);
      const model = models[modelName as keyof typeof models]

      await Eval(`weekly-document-generation-comparison`, {
        data: experimentData,
        experimentName: modelName,
        task: (input: any) => {
          return createDocument(input, model)
        },
        scores: [DocumentScorer],
        trialCount: 10,
        maxConcurrency: 3,
        metadata: {
          model: modelName,
          description:
            'Evaluating achievement extraction with company and project context',
          owner: 'ed',
        },
      });
    })
  );
}

runAll();