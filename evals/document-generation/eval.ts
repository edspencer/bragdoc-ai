import { Eval } from 'braintrust';
import { generateDocument} from '@/lib/ai/generate-document';
import { DocumentScorer } from './scorers';
import { experimentData } from './dataset';

const createDocument = async (input: any): Promise<string> => {
  const { fullStream } = await generateDocument(input);
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

// Create the evaluation
Eval('weekly-document-generation', {
  data: experimentData,
  task: createDocument,
  scores: [DocumentScorer],
  trialCount: 3,
  metadata: {
    model: 'gpt-4',
    description:
      'Evaluating achievement extraction with company and project context',
    owner: 'ed',
  },
});
