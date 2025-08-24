import { wrapAISDKModel, Eval } from 'braintrust';
import { openai } from '@ai-sdk/openai';
import { generateText } from 'ai';

import dataset, { type ChatTurn } from './datasets';

const experimentData = dataset.map((data) => ({
  input: { input: data.input, chat_history: data.chat_history },
  expected: data.expected,
}));
console.log(experimentData[0]);

async function runTask({
  input,
  chat_history,
}: { input: string; chat_history: ChatTurn[] }) {
  const model = wrapAISDKModel(openai.chat('gpt-4o'));

  const prompt = [
    {
      role: 'system',
      content: 'You are a helpful and polite assistant who knows about sports.',
    },
    ...(chat_history.map(({ role, content }) => ({
      role,
      content: [{ type: 'text', text: content }],
    })) as any),
    {
      role: 'user',
      content: [{ type: 'text', text: input }],
    },
  ];

  console.log(prompt);

  const { text } = await generateText({
    model,
    messages: prompt,
  });

  return text || '';
}

Eval('Chat assistant', {
  experimentName: 'gpt-4o assistant - no history',
  data: () => experimentData,
  task: runTask,
  scores: [Factual],
  trialCount: 3,
  metadata: {
    model: 'gpt-4o',
    prompt: 'You are a helpful and polite assistant who knows about sports.',
  },
});

import { LLMClassifierFromSpec, type Score } from 'autoevals';

function Factual(args: {
  input: {
    input: string;
    chat_history: ChatTurn[];
  };
  output: string;
  expected: string;
}): Score | Promise<Score> {
  const factualityScorer = LLMClassifierFromSpec('Factuality', {
    prompt: `You are comparing a submitted answer to an expert answer on a given question. Here is the data:
              [BEGIN DATA]
              ************
              [Question]: {{{input}}}
              ************
              [Expert]: {{{expected}}}
              ************
              [Submission]: {{{output}}}
              ************
              [END DATA]
 
              Compare the factual content of the submitted answer with the expert answer. Ignore any differences in style, grammar, or punctuation.
              The submitted answer may either be a subset or superset of the expert answer, or it may conflict with it. Determine which case applies. Answer the question by selecting one of the following options:
              (A) The submitted answer is a subset of the expert answer and is fully consistent with it.
              (B) The submitted answer is a superset of the expert answer and is fully consistent with it.
              (C) The submitted answer contains all the same details as the expert answer.
              (D) There is a disagreement between the submitted answer and the expert answer.
              (E) The answers differ, but these differences don't matter from the perspective of factuality.
              (F) The submitted answer asks for more context, specifics or clarification but provides factual information consistent with the expert answer.
              (G) The submitted answer asks for more context, specifics or clarification but does not provide factual information consistent with the expert answer.`,
    choice_scores: {
      A: 0.4,
      B: 0.6,
      C: 1,
      D: 0,
      E: 1,
      F: 0.2,
      G: 0,
    },
  });
  return factualityScorer(args);
}
