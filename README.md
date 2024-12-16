# brag.ai

AI chatbot that helps you keep a brag document about your achievements at work.

Helps employees shine in their performance reviews by keeping a record of their accomplishments,
and crafting beautiful documents to share with their managers for the year-end review, semi-annual review,
or any other time period. Or even just a "State of me" weekly update to manager, and monthly update to skip manager.

The existing UI is already a familiar chatbot experience, and has a "Canvas" mode that allows the human and an LLM to collaborate on a single document. There is an existing data model that represents these Documents, as well as other things.

Day to day, the user is just telling the chat bot about things they've done at work. Tasks they've completed, potentially things that are blocking them, unexpected events, etc. The chatbot will use an LLM to populate a database via the Brag model - a Brag being a thing that the user has achieved. Users might "brag" to the bot about one thing they've just achieved, or tell the bot about a bunch of things they've done over the last few weeks and didn't have time to brag about yet.

From time to time, the user will want a summary of these brags over some period. The period could be 6-12 months for a performance review, one week for a weekly summary to manager, one month for a monthly summary to skip manager, etc. The chatbot will use an LLM to generate a summary of these brags for the user, presenting it as a Document in the "Canvas" mode.

## Features

### Core Functionality
- Interactive chatbot interface for logging achievements
- Canvas mode for collaborative document editing with AI
- Intelligent achievement tracking and categorization
- Multi-company support as you change employers

### Achievement Logging
- Record individual or batch accomplishments
- Track projects and collaborators
- Document blockers and unexpected challenges
- Capture daily/weekly tasks and their impact

### Document Generation
- Performance review documents (6-12 month summaries)
- Weekly updates for direct managers
- Monthly summaries for skip-level managers
- Custom time period reports
- AI-assisted document editing and refinement

### Engagement & Reminders
- Email integration for sending achievements directly
- Automated reminder system for regular updates
- Email responses with AI-processed achievement logging
- Proactive notifications for extended periods without updates

### Data Management
- Persistent storage of achievements and documents
- Secure multi-company data separation
- Historical achievement tracking and access

### Auth
- Email/password authentication
- Google authentication
- GitHub authentication

### GitHub Integration
- Automatically creates Brags out of connected repositories!
- Can retro-actively link a repo, creating a Project for it and filling it with Brags from the repo history [Premium Feature]

## Homepage

Should have some copy about how many things you will forget without it.
Sign up / Sign in buttons

## Dev tasks

- Use LLM to generate a bunch of past conversations that a user could have had with Braggart to save their work on something
- Use this to drive Evals
- Use it to generate test & dev data (needs to be spread out over last 12 months ideally)

## Data Model

```js
type Brag = {
  id: uuid,
  userId: uuid,
  createdAt: Date,
  updatedAt: Date,
  eventStart: Date, //detected start data of the Brag
  eventEnd: Date, //detected end date of the Brag
  eventDuration: string, //day, week, month, quarter, half year, year - how long a time period this Brag covers (but eventStart/eventEnd are canonical)
  userMessageId: uuid, //the text the user submitted about this brag saved here
  summary: string, //the LLM summary of originalText
  title: string, //bullet list-compatible title for the Brag (LLM generated)
  details: string, //most
};

type UserMessage = {
  id: uuid,
  originalText: string, //what the user actually said

  brags: Brag[], //the one or more Brags detected in what the user said
};
```

## Business Model

### Free Level
- Free
- Some limitation on usage

### Basic Bragger
- $3/month
- $30/year
- Unlimited Brags/Docs/everything

### Pro Bragger
- $9/month
- $90/year
- GitHub integration

Should be integrated with Link or Stripe (Link has a really nice UX).

## Application Features

This application was initially built on top of a sample [Next.js](https://nextjs.org) app template from Vercel.
It has that following application-level features:

- [Next.js](https://nextjs.org) App Router
  - Advanced routing for seamless navigation and performance
  - React Server Components (RSCs) and Server Actions for server-side rendering and increased performance
- [AI SDK](https://sdk.vercel.ai/docs)
  - Unified API for generating text, structured objects, and tool calls with LLMs
  - Hooks for building dynamic chat and generative user interfaces
  - Supports OpenAI (default), Anthropic, Cohere, and other model providers
- [shadcn/ui](https://ui.shadcn.com)
  - Styling with [Tailwind CSS](https://tailwindcss.com)
  - Component primitives from [Radix UI](https://radix-ui.com) for accessibility and flexibility
- Data Persistence
  - [Vercel Postgres powered by Neon](https://vercel.com/storage/postgres) for saving chat history and user data
  - [Vercel Blob](https://vercel.com/storage/blob) for efficient file storage
- [NextAuth.js](https://github.com/nextauthjs/next-auth)
  - Simple and secure authentication

## Model Providers

This template ships with OpenAI `gpt-4o` as the default. However, with the [AI SDK](https://sdk.vercel.ai/docs), you can switch LLM providers to [OpenAI](https://openai.com), [Anthropic](https://anthropic.com), [Cohere](https://cohere.com/), and [many more](https://sdk.vercel.ai/providers/ai-sdk-providers) with just a few lines of code.

## Running locally

You will need to use the environment variables [defined in `.env.example`](.env.example) to run the Brag AI ChatBot. It's recommended you use [Vercel Environment Variables](https://vercel.com/docs/projects/environment-variables) for this, but a `.env` file is all that is necessary.

> Note: You should not commit your `.env` file or it will expose secrets that will allow others to control access to your various OpenAI and authentication provider accounts.

1. Install Vercel CLI: `npm i -g vercel`
2. Link local instance with Vercel and GitHub accounts (creates `.vercel` directory): `vercel link`
3. Download your environment variables: `vercel env pull`

```bash
pnpm install
pnpm dev
```

Your app template should now be running on [localhost:3000](http://localhost:3000/).
