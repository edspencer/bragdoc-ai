import { Container } from '@/components/salient/Container';
import {
  GitHubLogoIcon,
  NotionLogoIcon,
  FileIcon,
  CalendarIcon,
  EnvelopeClosedIcon,
  ChatBubbleIcon,
} from '@radix-ui/react-icons';

const integrations = [
  {
    name: 'GitHub',
    description:
      'Automatically extract achievements from pull requests, commits, and code reviews.',
    icon: GitHubLogoIcon,
    coming: false,
  },
  {
    name: 'Notion',
    description:
      'Sync your achievements directly to your Notion workspace and templates.',
    icon: NotionLogoIcon,
    coming: true,
  },
  {
    name: 'Google Docs',
    description:
      'Export your achievements and reviews directly to Google Docs for easy sharing.',
    icon: FileIcon,
    coming: true,
  },
  {
    name: 'Calendar',
    description:
      'Connect your calendar to capture achievements from meetings and presentations.',
    icon: CalendarIcon,
    coming: true,
  },
  {
    name: 'Email',
    description:
      'Forward praise and feedback emails to automatically capture achievements.',
    icon: EnvelopeClosedIcon,
    coming: true,
  },
  {
    name: 'Slack',
    description:
      'Capture achievements directly from your team communications and feedback.',
    icon: ChatBubbleIcon,
    coming: true,
  },
];

export function HowIntegrations() {
  return (
    <section
      id="integrations"
      aria-label="Integrations"
      className="py-20 sm:py-32"
    >
      <Container>
        <div className="mx-auto max-w-2xl md:text-center">
          <h2 className="font-display text-3xl tracking-tight text-slate-900 dark:text-slate-100 sm:text-4xl">
            Connects With Your Workflow
          </h2>
          <p className="mt-4 text-lg tracking-tight text-slate-700 dark:text-slate-300">
            bragdoc.ai integrates with your existing tools to automatically
            capture achievements where they happen.
          </p>
        </div>
        <div className="mx-auto mt-16 max-w-7xl">
          <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {integrations.map((integration) => (
              <div
                key={integration.name}
                className="relative overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800 p-8"
              >
                <div className="flex items-center gap-x-4">
                  <div className="flex size-10 items-center justify-center rounded-lg bg-slate-100 dark:bg-slate-800">
                    <integration.icon
                      className="size-6 text-slate-900 dark:text-slate-100"
                      aria-hidden="true"
                    />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                      {integration.name}
                    </h3>
                    {integration.coming && (
                      <span className="inline-flex items-center rounded-md bg-blue-50 dark:bg-blue-900/50 px-2 py-1 text-xs font-medium text-blue-700 dark:text-blue-300">
                        Coming Soon
                      </span>
                    )}
                  </div>
                </div>
                <p className="mt-4 text-sm text-slate-600 dark:text-slate-400">
                  {integration.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </Container>
    </section>
  );
}
