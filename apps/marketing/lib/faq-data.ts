export interface FAQQuestion {
  question: string;
  answer: string;
}

export interface FAQCategory {
  category: string;
  questions: FAQQuestion[];
}

export const faqData: FAQCategory[] = [
  {
    category: 'Getting Started',
    questions: [
      {
        question: 'How do I install BragDoc?',
        answer:
          'Simply run `npm install -g @bragdoc/cli` then `bragdoc login`. The entire setup takes about 2 minutes.',
      },
      {
        question: 'Do I need the CLI or can I use just the web app?',
        answer:
          'While both work, the CLI is enormously more convenient as it will continually extract your achievements automatically from your Git commits. The web app is great for reviewing and organizing, but the CLI handles the heavy lifting of tracking your work without any manual effort.',
      },
      {
        question: 'Which LLM should I use?',
        answer:
          "Ollama is free and runs locally on your machine. OpenAI and Anthropic are cloud-based options with excellent quality. It's your choice - all work great!",
      },
      {
        question: 'How long does setup take?',
        answer:
          'About 5 minutes total: install the CLI, login, initialize your project, and configure your LLM provider.',
      },
      {
        question: 'Can I try it before committing?',
        answer:
          'Yes! Every new account gets 10 free AI credits and 20 free chat messages to try cloud features. No credit card required.',
      },
    ],
  },
  {
    category: 'Privacy & Security',
    questions: [
      {
        question: 'Does BragDoc see my code?',
        answer:
          'No. The CLI only reads git commit metadata (messages, dates, authors). Your actual code never leaves your machine.',
      },
      {
        question: 'Where is my data stored?',
        answer:
          'Your achievements are stored in our US-based cloud infrastructure (or you can self-host). Your code always stays on your machine.',
      },
      {
        question: 'Can I self-host?',
        answer:
          'Yes! BragDoc is fully open source. You can deploy it to your own infrastructure and have complete control.',
      },
      {
        question: 'What data is sent to LLM providers?',
        answer:
          'This is configurable! You can choose to send just commit messages, commit messages plus diff stats, or even the entire diff if you want maximum context. Note that sending full diffs will use significantly more tokens, making it either slower or more expensive depending on your LLM provider. You can also apply various limits to the total number of tokens sent in the diff to control costs and performance.',
      },
      {
        question: 'How do I run 100% offline?',
        answer:
          'Self-host BragDoc and use local Ollama for AI processing. This gives you zero cloud dependencies.',
      },
      {
        question: 'Is it safe for proprietary code?',
        answer:
          'Yes. Your code never leaves your machine. Only achievements (which you review and approve) are sent to the cloud.',
      },
    ],
  },
  {
    category: 'Features & Usage',
    questions: [
      {
        question: 'When to Use BragDoc?',
        answer:
          '✅ Performance review season (self-assessment time)\n✅ Promotion prep (document your impact)\n✅ Weekly 1:1s with manager (what did I accomplish?)\n✅ Job hunting (update resume with recent work)',
      },
      {
        question: 'How much time does BragDoc save?',
        answer:
          "Most developers spend 5-10 hours per year either maintaining a manual brag doc or scrambling through Git history before reviews. With BragDoc, you'll spend about 15 minutes reviewing auto-generated achievements. That's roughly 5-10 hours saved annually—time you can spend coding or literally anything else.",
      },
      {
        question: 'How does achievement extraction work?',
        answer:
          'The CLI runs `git log`, sends commit messages to your configured LLM, the AI extracts achievements, and saves them to the web app for your review.',
      },
      {
        question: 'What git repositories are supported?',
        answer:
          "Any git repository. Public, private, GitHub, GitLab, Bitbucket, on-premise - if it's git, it works.",
      },
      {
        question: 'Can I use this with private repos?',
        answer:
          'Yes! The CLI runs locally on your machine and works with any repository you can access.',
      },
      {
        question: 'How accurate is the AI extraction?',
        answer:
          "Very accurate. You review and edit all extractions before they're saved. The AI learns your style over time.",
      },
      {
        question: 'Can I edit extracted achievements?',
        answer:
          'Yes! Full CRUD operations in the web app. Edit title, description, impact rating, dates, and project tags.',
      },
      {
        question: 'Does it work with monorepos?',
        answer:
          'Yes! The CLI analyzes the full git history regardless of your repository structure.',
      },
      {
        question: 'How many projects can I track?',
        answer: 'Unlimited on all plans. Track as many projects as you need.',
      },
    ],
  },
  {
    category: 'Pricing & Billing',
    questions: [
      {
        question: "What's actually free?",
        answer:
          'The free tier includes manual achievement tracking, CLI with your own LLM, plus 10 free AI credits and 20 free chat messages to try cloud features.',
      },
      {
        question: 'What do I pay for?',
        answer:
          'Cloud AI features (document generation, standup summaries, AI chat) require a subscription: $45/year or $99 lifetime. Free trial credits let you try before you buy.',
      },
      {
        question: 'How much does LLM usage cost?',
        answer:
          '$0.01-0.05 per 100 commits with GPT-4. $0 with Ollama running locally.',
      },
      {
        question: 'Can I switch between free and paid?',
        answer:
          'Yes, anytime. No contracts or commitments. Upgrade when you need more cloud AI credits.',
      },
      {
        question: 'What payment methods do you accept?',
        answer:
          'Credit card via Stripe. Annual plans can be canceled anytime with no penalties.',
      },
      {
        question: 'Can I get a refund?',
        answer:
          "Yes, within 30 days if you're not satisfied. Lifetime purchases are also refundable within 30 days.",
      },
      {
        question: 'Is there enterprise pricing?',
        answer:
          'No. This is an individual tool aimed at individual software engineers, not enterprises.',
      },
    ],
  },
  {
    category: 'CLI Specific',
    questions: [
      {
        question: 'Which operating systems are supported?',
        answer: 'macOS, Linux, and Windows. Node.js 18+ is required.',
      },
      {
        question: 'How do I update the CLI?',
        answer: 'Run `npm update -g @bragdoc/cli` to get the latest version.',
      },
      {
        question: 'Where are logs stored?',
        answer:
          'Logs are stored at `~/.bragdoc/logs/combined.log` on your machine.',
      },
      {
        question: 'How do I troubleshoot extraction?',
        answer:
          'Check the logs, run with the `--dry-run` flag to preview, and verify your LLM configuration.',
      },
      {
        question: 'Can I run extraction manually?',
        answer:
          'Yes! Run `bragdoc extract` anytime to manually trigger extraction.',
      },
      {
        question: 'How does caching work?',
        answer:
          'The CLI stores processed commit hashes locally. It never reprocesses the same commits.',
      },
      {
        question: 'How do I change my schedule?',
        answer:
          'Use `bragdoc projects update --schedule "0 18 * * *"` to update your extraction schedule.',
      },
    ],
  },
  {
    category: 'Technical',
    questions: [
      {
        question: 'What version of Node.js do I need?',
        answer: 'Node.js 18 or higher is required.',
      },
      {
        question: 'Does it work with GitHub Enterprise?',
        answer:
          'Yes! Any git repository accessible to your machine works, including GitHub Enterprise.',
      },
      {
        question: 'Can I use with GitLab/Bitbucket?',
        answer:
          'Yes! The CLI works with any git repository, regardless of hosting provider.',
      },
      {
        question: 'How does the CLI authenticate?',
        answer:
          'Browser OAuth flow. The JWT token is stored securely in `~/.bragdoc/config.yml`.',
      },
      {
        question: 'Can I use multiple devices?',
        answer:
          'Yes! Login on each device. You can revoke access from any device in the web app settings.',
      },
      {
        question: 'How do I migrate between instances?',
        answer:
          'Export your data as JSON from one instance and import it to the new instance.',
      },
    ],
  },
  {
    category: 'Comparisons',
    questions: [
      {
        question: 'How is this different from a TODO app?',
        answer:
          "TODO apps track tasks you need to do. BragDoc tracks the impact and achievements you've already accomplished, with AI analysis.",
      },
      {
        question: 'How is this different from journaling?',
        answer:
          'Journaling is manual and requires discipline. BragDoc is automatic via git commits and AI-powered.',
      },
      {
        question: 'Why not just keep notes in Notion?',
        answer:
          'Manual notes require constant discipline. BragDoc is automatic and AI-powered, extracting achievements from your actual work.',
      },
      {
        question: 'Compared to LinkedIn Endorsements?',
        answer:
          'BragDoc is private, detailed, and data-driven. LinkedIn is public and social-focused.',
      },
      {
        question: 'Compared to performance review tools?',
        answer:
          'BragDoc tracks daily and prepares you for reviews. Traditional review tools are periodic and retrospective.',
      },
    ],
  },
];
