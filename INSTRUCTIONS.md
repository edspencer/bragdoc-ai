# Instructions for reasoning and implementation of features in this repository

## Code Generation

- The project uses pnpm
- Use the Vercel AI SDK for any calls to LLMs
- Each time we call a Vercel AI SDK function like generateText, streamText, generateObject, etc, we are calling an LLM, therefore we should. See the ai-docs/braintrust_demo.ts file for an example of how to create an Eval to test this invokation of the LLM

## Project Structure

### Core Library Code
- All reusable library code should be in the `lib` folder
- This includes AI/LLM function calls (e.g., generateObject, generateText)
- Keep implementation details separate from evaluation and testing code

### Evaluations and Testing
```
/
├── lib/                     # Core library code
│   └── ai/                 # AI/LLM function implementations
├── evals/                   # BrainTrust evaluations
│   ├── single-brag/        # Single brag logging evaluations
│   │   ├── eval.ts        # BrainTrust evaluation setup
│   │   ├── dataset.ts     # Example conversations
│   │   ├── generator.ts   # Generator for example conversations
│   │   └── generated/     # Generated example conversations
│   └── types.ts           # Shared types for evals
├── test/                   # Jest tests
│   └── evals/
│       └── single-brag/
│           ├── dataset.test.ts
│           └── processing.test.ts
└── jest.config.ts
```

## Development Tools

### Testing
- Jest for unit testing
- @types/jest for TypeScript support
- ts-jest for TypeScript integration
- @testing-library/jest-dom for DOM testing utilities
- @swc/jest for faster test execution

### TypeScript Execution
- Use `tsx` for running TypeScript files directly
- Example: `pnpm tsx path/to/file.ts`

## Code Organization
- Keep example conversations, evaluations, and related code separate from the `ai-docs` directory
- Use TypeScript for all code files
- Maintain proper type definitions in `types.ts` files