// @ts-check
/**
 * The docs sidebar, maintained BY HAND: Starlight does not auto-discover pages, so a new page must be added here
 * (test/docs.test.ts fails on a page missing from it, or an entry without a page).
 *
 * It lives in its own module because two things read it: astro.config.mjs (the sidebar itself) and
 * src/llms.ts (the order of pages in /llms.txt and /llms-full.txt), so the two can't disagree.
 *
 * Never point an entry at `/`: that is the landing page, which renders outside Starlight with no sidebar and no
 * way back. The blog (/blog/) isn't a docs page either; it is linked from the header and the landing page.
 *
 * @type {any[]}
 */
export const SIDEBAR = [
	{
		label: 'Start here',
		collapsed: false,
		items: [
			// NOT `link: '/'`: `/` is the landing page, which renders outside Starlight with no sidebar and no way back.
			{ label: 'Introduction', slug: 'introduction' },
			{ label: 'Installation', slug: 'getting-started/installation' },
			{ label: 'Quickstart', slug: 'getting-started/quickstart' },
		],
	},
	{
		label: 'Concepts',
		collapsed: false,
		items: [
			{ label: 'The board', slug: 'concepts/board' },
			{ label: 'Evidence', slug: 'concepts/evidence' },
			{ label: 'Found and sources', slug: 'concepts/found-and-sources' },
			{ label: 'Projects, companies, repos', slug: 'concepts/projects' },
			{ label: 'Folio', slug: 'concepts/folio' },
			{ label: 'Your data is files', slug: 'concepts/your-data-is-files' },
		],
	},
	{
		label: 'Agents',
		collapsed: false,
		items: [
			{ label: 'Working with agents', slug: 'agents/overview' },
			{ label: 'MCP server', slug: 'agents/mcp' },
			{ label: 'The agent guide', slug: 'agents/agent-guide' },
		],
	},
	{
		label: 'AI (opt-in)',
		collapsed: false,
		items: [
			{ label: 'Off unless you turn it on', slug: 'ai/overview' },
			{ label: 'Setting up a local model', slug: 'ai/local-models' },
			{ label: 'Choosing a model', slug: 'ai/choosing-a-model' },
			{ label: 'The judge, in Found', slug: 'ai/the-judge' },
			{ label: 'Tidy this up', slug: 'ai/tidy' },
			{ label: 'Draft with AI', slug: 'ai/draft' },
			{ label: 'Cloud: Anthropic', slug: 'ai/cloud/anthropic' },
			{ label: 'Cloud: OpenAI', slug: 'ai/cloud/openai' },
			{ label: 'Cloud: OpenRouter', slug: 'ai/cloud/openrouter' },
			{ label: 'Cloud: Jev', slug: 'ai/cloud/jev' },
			{ label: 'Cloud: any other server', slug: 'ai/cloud/custom' },
		],
	},
	{
		label: 'Guarantees',
		collapsed: false,
		items: [
			{ label: 'Localhost security', slug: 'guarantees/localhost-security' },
			{ label: 'Network activity', slug: 'guarantees/network-activity' },
			{ label: 'AI is opt-in', slug: 'guarantees/ai-is-opt-in' },
		],
	},
	{
		label: 'Reference',
		collapsed: true,
		items: [
			{ label: 'CLI', slug: 'reference/cli' },
			{ label: 'HTTP API', slug: 'reference/http-api' },
			{ label: 'The data folder', slug: 'reference/data-folder' },
			{ label: 'config.yaml', slug: 'reference/config-yaml' },
			{ label: 'Environment variables', slug: 'reference/environment' },
		],
	},
	{
		label: 'Project',
		collapsed: false,
		items: [
			{ label: 'Moving from the hosted app', slug: 'moving-from-the-hosted-app' },
			{ label: "What's new", slug: 'whats-new' },
			{ label: 'Roadmap', slug: 'roadmap' },
			{ label: 'Contributing', slug: 'contributing' },
		],
	},
];
