// @ts-nocheck
import React from 'react';
import { LLMClassifierFromSpec, type Score } from 'autoevals';
import { renderMDX } from 'mdx-prompt';

import {
  Prompt,
  Purpose,
  Instructions,
  InputFormat,
  OutputFormat,
  Data,
  ChatHistory,
} from 'mdx-prompt/components';

export interface RouterScorerProps {
  userInstructions: string;
  chatHistory: any;
  expected: string;
  output: string;
  input: string;
  message: string;
}

const outputFormat = `
(A) The tool call matches expectations perfectly
(B) The tool call is good but missing minor details
(C) The tool call has minor issues but is generally acceptable
(D) The tool call has significant issues or missing information
(E) The tool call is completely incorrect or inappropriate`;

const instructions = [
  'When assessing tool calls, do not pay any attention to toolCallId',
  `Overall Assessment: Select one of the following grades: ${outputFormat}`,
];

function EvaluateRouterPrompt({
  expected,
  output,
  input,
  chatHistory,
  message,
}: RouterScorerProps) {
  return (
    <Prompt>
      <Purpose>
        You are an evaluator assessing how well an AI system generated a called
        a tool based on the tools available and the user message.
      </Purpose>
      <background>
        bragdoc.ai helps people track their professional achievements and
        generate documents such as weekly updates, monthly updates, and
        performance review documents. Users may ask an LLM to perform various
        tasks with natural language; your task is to evaluate if the LLM invoked
        those tasks correctly by comparing tool call objects.
      </background>
      <Instructions instructions={instructions} />
      <InputFormat>
        You will receive a JSON blob with the following fields:
        <user-input>The user input</user-input>
        <expected>A JSON blob of the expected result</expected>
        <output>A JSON blob of the actual result</output>
        <chat-history>The chat history context (if any)</chat-history>
        <message>The message that triggered the tool call</message>
      </InputFormat>
      <OutputFormat
        format={`Answer by selecting one of the following options: ${outputFormat}`}
      />
      <Data>
        <user-input>{input}</user-input>
        <actual>{output}</actual>
        <expected>{expected}</expected>
        <message>{message}</message>
        <ChatHistory messages={chatHistory} />
      </Data>
    </Prompt>
  );
}

export async function RouterScorer(args: any): Promise<Score> {
  const prompt = await renderMDX(
    <EvaluateRouterPrompt
      userInstructions={args.input.userInstructions}
      chatHistory={args.input.chatHistory}
      expected={JSON.stringify(args.expected, null, 2)}
      output={JSON.stringify(args.output, null, 2)}
      input={JSON.stringify(args.input, null, 2)}
      message={args.input.message}
    />,
  );

  return LLMClassifierFromSpec('RouterScorer', {
    prompt,
    choice_scores: {
      A: 1.0, // Perfect match
      B: 0.8, // Good but missing details
      C: 0.6, // Minor issues
      D: 0.3, // Major issues
      E: 0.0, // Completely wrong
    },
  })(args);
}
