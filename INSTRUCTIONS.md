# Instructions for reasoning and implementation of features in this repository

## Code Generation

- Use the Vercel AI SDK for any calls to LLMs
- Each time we call a Vercel AI SDK function like generateText, streamText, generateObject, etc, we are calling an LLM, therefore we should. See the ai-docs/braintrust_demo.ts file for an example of how to create an Eval to test this invokation of the LLM