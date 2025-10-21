'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import {
  Terminal,
  Lock,
  Shield,
  Menu,
  X,
  ChevronRight,
  Download,
  Settings,
  Zap,
  AlertCircle,
} from 'lucide-react';
import { CodeBlock } from '@/components/code-block';

const navigation = [
  { id: 'introduction', label: 'Introduction' },
  { id: 'quick-start', label: 'Quick Start' },
  { id: 'authentication', label: 'Authentication' },
  { id: 'project-management', label: 'Project Management' },
  { id: 'extraction', label: 'Achievement Extraction' },
  { id: 'standup', label: 'Standup Commands' },
  { id: 'llm', label: 'LLM Configuration' },
  { id: 'data', label: 'Data Management' },
  { id: 'configuration', label: 'Configuration' },
  { id: 'providers', label: 'LLM Providers' },
  { id: 'scheduling', label: 'Scheduling' },
  { id: 'privacy', label: 'Privacy & Security' },
  { id: 'troubleshooting', label: 'Troubleshooting' },
];

export function CliDocumentation() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeSection, setActiveSection] = useState('introduction');

  const scrollToSection = (id: string) => {
    setActiveSection(id);
    setMobileMenuOpen(false);
    const element = document.getElementById(id);
    if (element) {
      const offset = 100;
      const elementPosition = element.getBoundingClientRect().top;
      const offsetPosition = elementPosition + window.pageYOffset - offset;
      window.scrollTo({
        top: offsetPosition,
        behavior: 'smooth',
      });
    }
  };

  return (
    <div className="min-h-screen pt-16">
      {/* Mobile Menu Button */}
      <div className="lg:hidden fixed top-20 left-4 z-40">
        <Button
          variant="outline"
          size="icon"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="bg-background"
        >
          {mobileMenuOpen ? (
            <X className="size-4" />
          ) : (
            <Menu className="size-4" />
          )}
        </Button>
      </div>

      {/* Sidebar Navigation */}
      <aside
        className={`fixed top-16 left-0 bottom-0 w-64 border-r border-border bg-background overflow-y-auto transition-transform duration-300 z-30 ${
          mobileMenuOpen
            ? 'translate-x-0'
            : '-translate-x-full lg:translate-x-0'
        }`}
      >
        <nav className="p-6 space-y-1">
          {navigation.map((item) => (
            <button
              key={item.id}
              onClick={() => scrollToSection(item.id)}
              className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors flex items-center gap-2 ${
                activeSection === item.id
                  ? 'bg-accent text-accent-foreground font-medium'
                  : 'text-muted-foreground hover:text-foreground hover:bg-accent/50'
              }`}
            >
              <ChevronRight className="size-3" />
              {item.label}
            </button>
          ))}
        </nav>
      </aside>

      {/* Main Content */}
      <main className="lg:ml-64 px-4 sm:px-6 lg:px-8 py-12 max-w-4xl">
        {/* Header */}
        <div className="mb-12">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[var(--feature-accent)]/10 text-[var(--feature-accent)] text-sm font-medium mb-4">
            <Terminal className="size-4" />
            Command Line Interface
          </div>
          <h1 className="text-4xl sm:text-5xl font-bold mb-4 text-balance">
            BragDoc CLI - Your Achievement Extraction Engine
          </h1>
          <p className="text-xl text-muted-foreground text-pretty">
            Complete command reference and configuration guide
          </p>
        </div>

        {/* Introduction */}
        <section id="introduction" className="mb-16 scroll-mt-24">
          <h2 className="text-3xl font-bold mb-6">Introduction</h2>
          <div className="prose prose-neutral dark:prose-invert max-w-none">
            <p className="text-lg text-muted-foreground mb-4">
              The BragDoc CLI is a privacy-first command-line tool that analyzes
              your git commits and extracts meaningful achievements. It runs
              entirely on your machine, ensuring your code never leaves your
              computer.
            </p>
            <Card className="p-6 bg-muted/50 border-[var(--feature-accent)]/20">
              <div className="flex items-start gap-3">
                <Shield className="size-5 text-[var(--feature-accent)] mt-0.5 shrink-0" />
                <div>
                  <h3 className="font-semibold mb-2">
                    Privacy-First Architecture
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    The CLI only reads git metadata (commit messages, dates,
                    authors). Your actual code stays on your machine. Only
                    achievement summaries are sent to the web app.
                  </p>
                </div>
              </div>
            </Card>
            <div className="mt-6">
              <h3 className="text-lg font-semibold mb-2">Requirements</h3>
              <ul className="list-disc list-inside text-muted-foreground space-y-1">
                <li>Node.js 18 or higher</li>
                <li>Git installed and configured</li>
                <li>BragDoc account (sign up at app.bragdoc.ai)</li>
              </ul>
            </div>
          </div>
        </section>

        {/* Quick Start */}
        <section id="quick-start" className="mb-16 scroll-mt-24">
          <h2 className="text-3xl font-bold mb-6">Quick Start</h2>
          <Card className="p-6">
            <CodeBlock
              language="bash"
              code={`# Install
npm install -g @bragdoc/cli

# Authenticate
bragdoc login

# Initialize project
bragdoc init

# Extract achievements
bragdoc extract`}
            />
          </Card>
        </section>

        {/* Authentication Commands */}
        <section id="authentication" className="mb-16 scroll-mt-24">
          <h2 className="text-3xl font-bold mb-6">Authentication Commands</h2>
          <Accordion type="single" collapsible className="space-y-4">
            <AccordionItem value="login" className="border rounded-lg px-6">
              <AccordionTrigger className="hover:no-underline">
                <div className="flex items-center gap-3">
                  <code className="text-sm font-mono bg-muted px-2 py-1 rounded">
                    bragdoc login
                  </code>
                </div>
              </AccordionTrigger>
              <AccordionContent className="pt-4">
                <p className="text-muted-foreground mb-4">
                  Complete OAuth flow to authenticate with BragDoc. Opens your
                  browser automatically.
                </p>
                <CodeBlock language="bash" code="bragdoc login" />
                <p className="text-sm text-muted-foreground mt-4">
                  Stores authentication token in{' '}
                  <code className="bg-muted px-1 rounded">
                    ~/.bragdoc/config.yml
                  </code>
                </p>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="logout" className="border rounded-lg px-6">
              <AccordionTrigger className="hover:no-underline">
                <code className="text-sm font-mono bg-muted px-2 py-1 rounded">
                  bragdoc logout
                </code>
              </AccordionTrigger>
              <AccordionContent className="pt-4">
                <p className="text-muted-foreground mb-4">
                  Remove local authentication token.
                </p>
                <CodeBlock language="bash" code="bragdoc logout" />
              </AccordionContent>
            </AccordionItem>

            <AccordionItem
              value="auth-status"
              className="border rounded-lg px-6"
            >
              <AccordionTrigger className="hover:no-underline">
                <code className="text-sm font-mono bg-muted px-2 py-1 rounded">
                  bragdoc auth status
                </code>
              </AccordionTrigger>
              <AccordionContent className="pt-4">
                <p className="text-muted-foreground mb-4">
                  Check authentication status and token expiration.
                </p>
                <CodeBlock language="bash" code="bragdoc auth status" />
                <p className="text-sm text-muted-foreground mt-4">
                  Shows expiry date and user information.
                </p>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </section>

        {/* Project Management */}
        <section id="project-management" className="mb-16 scroll-mt-24">
          <h2 className="text-3xl font-bold mb-6">Project Management</h2>
          <Accordion type="single" collapsible className="space-y-4">
            <AccordionItem value="init" className="border rounded-lg px-6">
              <AccordionTrigger className="hover:no-underline">
                <code className="text-sm font-mono bg-muted px-2 py-1 rounded">
                  bragdoc init
                </code>
              </AccordionTrigger>
              <AccordionContent className="pt-4">
                <p className="text-muted-foreground mb-4">
                  Quick project setup in current directory with interactive
                  prompts.
                </p>
                <CodeBlock language="bash" code="bragdoc init" />
              </AccordionContent>
            </AccordionItem>

            <AccordionItem
              value="projects-add"
              className="border rounded-lg px-6"
            >
              <AccordionTrigger className="hover:no-underline">
                <code className="text-sm font-mono bg-muted px-2 py-1 rounded">
                  bragdoc projects add
                </code>
              </AccordionTrigger>
              <AccordionContent className="pt-4">
                <p className="text-muted-foreground mb-4">
                  Add project with custom settings.
                </p>
                <CodeBlock
                  language="bash"
                  code={`bragdoc projects add ~/code/my-app --schedule "0 18 * * *"`}
                />
                <div className="mt-4 space-y-2">
                  <h4 className="font-semibold text-sm">Options:</h4>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li>
                      <code className="bg-muted px-1 rounded">--schedule</code>{' '}
                      - Cron schedule for automatic extraction
                    </li>
                    <li>
                      <code className="bg-muted px-1 rounded">
                        --max-commits
                      </code>{' '}
                      - Maximum commits to process (default: 300)
                    </li>
                  </ul>
                </div>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem
              value="projects-list"
              className="border rounded-lg px-6"
            >
              <AccordionTrigger className="hover:no-underline">
                <code className="text-sm font-mono bg-muted px-2 py-1 rounded">
                  bragdoc projects list
                </code>
              </AccordionTrigger>
              <AccordionContent className="pt-4">
                <p className="text-muted-foreground mb-4">
                  Show all configured projects and schedules.
                </p>
                <CodeBlock language="bash" code="bragdoc projects list" />
              </AccordionContent>
            </AccordionItem>

            <AccordionItem
              value="projects-update"
              className="border rounded-lg px-6"
            >
              <AccordionTrigger className="hover:no-underline">
                <code className="text-sm font-mono bg-muted px-2 py-1 rounded">
                  bragdoc projects update
                </code>
              </AccordionTrigger>
              <AccordionContent className="pt-4">
                <p className="text-muted-foreground mb-4">
                  Modify project settings.
                </p>
                <CodeBlock
                  language="bash"
                  code={`bragdoc projects update . --schedule "0 */4 * * *"`}
                />
              </AccordionContent>
            </AccordionItem>

            <AccordionItem
              value="projects-enable"
              className="border rounded-lg px-6"
            >
              <AccordionTrigger className="hover:no-underline">
                <code className="text-sm font-mono bg-muted px-2 py-1 rounded">
                  bragdoc projects enable/disable
                </code>
              </AccordionTrigger>
              <AccordionContent className="pt-4">
                <p className="text-muted-foreground mb-4">
                  Toggle automatic extraction.
                </p>
                <CodeBlock
                  language="bash"
                  code="bragdoc projects disable ~/code/old-app"
                />
              </AccordionContent>
            </AccordionItem>

            <AccordionItem
              value="projects-remove"
              className="border rounded-lg px-6"
            >
              <AccordionTrigger className="hover:no-underline">
                <code className="text-sm font-mono bg-muted px-2 py-1 rounded">
                  bragdoc projects remove
                </code>
              </AccordionTrigger>
              <AccordionContent className="pt-4">
                <p className="text-muted-foreground mb-4">
                  Remove project from tracking.
                </p>
                <CodeBlock
                  language="bash"
                  code="bragdoc projects remove ~/code/archived-app"
                />
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </section>

        {/* Achievement Extraction */}
        <section id="extraction" className="mb-16 scroll-mt-24">
          <h2 className="text-3xl font-bold mb-6">Achievement Extraction</h2>
          <Accordion type="single" collapsible className="space-y-4">
            <AccordionItem value="extract" className="border rounded-lg px-6">
              <AccordionTrigger className="hover:no-underline">
                <code className="text-sm font-mono bg-muted px-2 py-1 rounded">
                  bragdoc extract
                </code>
              </AccordionTrigger>
              <AccordionContent className="pt-4">
                <p className="text-muted-foreground mb-4">
                  Extract achievements from current project. Analyzes commits,
                  sends to LLM, and saves to web app.
                </p>
                <CodeBlock language="bash" code="bragdoc extract" />
              </AccordionContent>
            </AccordionItem>

            <AccordionItem
              value="extract-dry-run"
              className="border rounded-lg px-6"
            >
              <AccordionTrigger className="hover:no-underline">
                <code className="text-sm font-mono bg-muted px-2 py-1 rounded">
                  bragdoc extract --dry-run
                </code>
              </AccordionTrigger>
              <AccordionContent className="pt-4">
                <p className="text-muted-foreground mb-4">
                  Preview extraction without sending to API.
                </p>
                <CodeBlock language="bash" code="bragdoc extract --dry-run" />
              </AccordionContent>
            </AccordionItem>

            <AccordionItem
              value="extract-max-commits"
              className="border rounded-lg px-6"
            >
              <AccordionTrigger className="hover:no-underline">
                <code className="text-sm font-mono bg-muted px-2 py-1 rounded">
                  bragdoc extract --max-commits
                </code>
              </AccordionTrigger>
              <AccordionContent className="pt-4">
                <p className="text-muted-foreground mb-4">
                  Override default commit limit.
                </p>
                <CodeBlock
                  language="bash"
                  code="bragdoc extract --max-commits 500"
                />
              </AccordionContent>
            </AccordionItem>

            <AccordionItem
              value="extract-branch"
              className="border rounded-lg px-6"
            >
              <AccordionTrigger className="hover:no-underline">
                <code className="text-sm font-mono bg-muted px-2 py-1 rounded">
                  bragdoc extract --branch
                </code>
              </AccordionTrigger>
              <AccordionContent className="pt-4">
                <p className="text-muted-foreground mb-4">
                  Extract from specific branch.
                </p>
                <CodeBlock
                  language="bash"
                  code="bragdoc extract --branch main"
                />
              </AccordionContent>
            </AccordionItem>

            <AccordionItem
              value="extract-no-cache"
              className="border rounded-lg px-6"
            >
              <AccordionTrigger className="hover:no-underline">
                <code className="text-sm font-mono bg-muted px-2 py-1 rounded">
                  bragdoc extract --no-cache
                </code>
              </AccordionTrigger>
              <AccordionContent className="pt-4">
                <p className="text-muted-foreground mb-4">
                  Force reprocess all commits (ignore cache).
                </p>
                <CodeBlock language="bash" code="bragdoc extract --no-cache" />
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </section>

        {/* Standup Commands */}
        <section id="standup" className="mb-16 scroll-mt-24">
          <h2 className="text-3xl font-bold mb-6">Standup Commands</h2>
          <Accordion type="single" collapsible className="space-y-4">
            <AccordionItem
              value="standup-enable"
              className="border rounded-lg px-6"
            >
              <AccordionTrigger className="hover:no-underline">
                <code className="text-sm font-mono bg-muted px-2 py-1 rounded">
                  bragdoc standup enable
                </code>
              </AccordionTrigger>
              <AccordionContent className="pt-4">
                <p className="text-muted-foreground mb-4">
                  Enroll current project in a standup. Sets up automatic WIP
                  extraction before standup time.
                </p>
                <CodeBlock language="bash" code="bragdoc standup enable" />
              </AccordionContent>
            </AccordionItem>

            <AccordionItem
              value="standup-wip"
              className="border rounded-lg px-6"
            >
              <AccordionTrigger className="hover:no-underline">
                <code className="text-sm font-mono bg-muted px-2 py-1 rounded">
                  bragdoc standup wip
                </code>
              </AccordionTrigger>
              <AccordionContent className="pt-4">
                <p className="text-muted-foreground mb-4">
                  Manual WIP extraction right now. Shows uncommitted changes
                  analysis.
                </p>
                <CodeBlock language="bash" code="bragdoc standup wip" />
              </AccordionContent>
            </AccordionItem>

            <AccordionItem
              value="standup-status"
              className="border rounded-lg px-6"
            >
              <AccordionTrigger className="hover:no-underline">
                <code className="text-sm font-mono bg-muted px-2 py-1 rounded">
                  bragdoc standup status
                </code>
              </AccordionTrigger>
              <AccordionContent className="pt-4">
                <p className="text-muted-foreground mb-4">
                  Check standup enrollment status.
                </p>
                <CodeBlock language="bash" code="bragdoc standup status" />
              </AccordionContent>
            </AccordionItem>

            <AccordionItem
              value="standup-disable"
              className="border rounded-lg px-6"
            >
              <AccordionTrigger className="hover:no-underline">
                <code className="text-sm font-mono bg-muted px-2 py-1 rounded">
                  bragdoc standup disable
                </code>
              </AccordionTrigger>
              <AccordionContent className="pt-4">
                <p className="text-muted-foreground mb-4">
                  Unenroll from standup.
                </p>
                <CodeBlock language="bash" code="bragdoc standup disable" />
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </section>

        {/* LLM Configuration */}
        <section id="llm" className="mb-16 scroll-mt-24">
          <h2 className="text-3xl font-bold mb-6">LLM Configuration</h2>
          <Accordion type="single" collapsible className="space-y-4">
            <AccordionItem value="llm-show" className="border rounded-lg px-6">
              <AccordionTrigger className="hover:no-underline">
                <code className="text-sm font-mono bg-muted px-2 py-1 rounded">
                  bragdoc llm show
                </code>
              </AccordionTrigger>
              <AccordionContent className="pt-4">
                <p className="text-muted-foreground mb-4">
                  Display current LLM configuration including provider, model,
                  and API endpoint.
                </p>
                <CodeBlock language="bash" code="bragdoc llm show" />
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="llm-set" className="border rounded-lg px-6">
              <AccordionTrigger className="hover:no-underline">
                <code className="text-sm font-mono bg-muted px-2 py-1 rounded">
                  bragdoc llm set
                </code>
              </AccordionTrigger>
              <AccordionContent className="pt-4">
                <p className="text-muted-foreground mb-4">
                  Configure or change LLM provider with interactive wizard.
                </p>
                <CodeBlock language="bash" code="bragdoc llm set" />
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </section>

        {/* Data Management */}
        <section id="data" className="mb-16 scroll-mt-24">
          <h2 className="text-3xl font-bold mb-6">Data Management</h2>
          <Accordion type="single" collapsible className="space-y-4">
            <AccordionItem
              value="data-fetch"
              className="border rounded-lg px-6"
            >
              <AccordionTrigger className="hover:no-underline">
                <code className="text-sm font-mono bg-muted px-2 py-1 rounded">
                  bragdoc data fetch
                </code>
              </AccordionTrigger>
              <AccordionContent className="pt-4">
                <p className="text-muted-foreground mb-4">
                  Sync latest data from web app. Updates local cache of
                  companies, projects, and standups.
                </p>
                <CodeBlock language="bash" code="bragdoc data fetch" />
              </AccordionContent>
            </AccordionItem>

            <AccordionItem
              value="data-clear"
              className="border rounded-lg px-6"
            >
              <AccordionTrigger className="hover:no-underline">
                <code className="text-sm font-mono bg-muted px-2 py-1 rounded">
                  bragdoc data clear
                </code>
              </AccordionTrigger>
              <AccordionContent className="pt-4">
                <p className="text-muted-foreground mb-4">
                  Clear local data cache.
                </p>
                <CodeBlock language="bash" code="bragdoc data clear" />
              </AccordionContent>
            </AccordionItem>

            <AccordionItem
              value="cache-list"
              className="border rounded-lg px-6"
            >
              <AccordionTrigger className="hover:no-underline">
                <code className="text-sm font-mono bg-muted px-2 py-1 rounded">
                  bragdoc cache list
                </code>
              </AccordionTrigger>
              <AccordionContent className="pt-4">
                <p className="text-muted-foreground mb-4">
                  Show cached commits.
                </p>
                <CodeBlock language="bash" code="bragdoc cache list" />
              </AccordionContent>
            </AccordionItem>

            <AccordionItem
              value="cache-clear"
              className="border rounded-lg px-6"
            >
              <AccordionTrigger className="hover:no-underline">
                <code className="text-sm font-mono bg-muted px-2 py-1 rounded">
                  bragdoc cache clear
                </code>
              </AccordionTrigger>
              <AccordionContent className="pt-4">
                <p className="text-muted-foreground mb-4">
                  Clear commit cache. Forces reprocessing on next extraction.
                </p>
                <CodeBlock language="bash" code="bragdoc cache clear" />
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </section>

        {/* Configuration Guide */}
        <section id="configuration" className="mb-16 scroll-mt-24">
          <h2 className="text-3xl font-bold mb-6">Configuration Guide</h2>
          <div className="space-y-6">
            <div>
              <h3 className="text-xl font-semibold mb-3">
                Config File Location
              </h3>
              <Card className="p-4">
                <div className="flex items-center gap-2 text-sm">
                  <Settings className="size-4 text-muted-foreground" />
                  <code className="font-mono">~/.bragdoc/config.yml</code>
                </div>
                <p className="text-sm text-muted-foreground mt-2">
                  File permissions: 600 (secure)
                </p>
              </Card>
            </div>

            <div>
              <h3 className="text-xl font-semibold mb-3">
                Example Configuration
              </h3>
              <Card className="p-6">
                <CodeBlock
                  language="yaml"
                  code={`auth:
  token: "<your-token>"
  expiresAt: 1234567890

projects:
  - path: "/Users/you/projects/app1"
    name: "My App"
    enabled: true
    maxCommits: 300
    cronSchedule: "0 18 * * *"
    id: "project-uuid-from-web-app"

standups:
  - id: "standup-uuid"
    name: "Team Standup"
    enabled: true
    cronSchedule: "35 9 * * 1-5"

llm:
  provider: "openai"
  openai:
    model: "gpt-4"
    apiKey: "<your-key>"

settings:
  defaultMaxCommits: 300
  maxCommitsPerBatch: 10
  apiBaseUrl: "https://app.bragdoc.ai"`}
                />
              </Card>
            </div>
          </div>
        </section>

        {/* LLM Provider Setup */}
        <section id="providers" className="mb-16 scroll-mt-24">
          <h2 className="text-3xl font-bold mb-6">LLM Provider Setup</h2>
          <Tabs defaultValue="openai" className="w-full">
            <TabsList className="grid w-full grid-cols-3 lg:grid-cols-6">
              <TabsTrigger value="openai">OpenAI</TabsTrigger>
              <TabsTrigger value="anthropic">Anthropic</TabsTrigger>
              <TabsTrigger value="google">Google</TabsTrigger>
              <TabsTrigger value="deepseek">DeepSeek</TabsTrigger>
              <TabsTrigger value="ollama">Ollama</TabsTrigger>
              <TabsTrigger value="compatible">Compatible</TabsTrigger>
            </TabsList>

            <TabsContent value="openai" className="space-y-4">
              <Card className="p-6">
                <h3 className="font-semibold mb-3">OpenAI</h3>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li>Get API key from platform.openai.com</li>
                  <li>Recommended models: gpt-4, gpt-3.5-turbo</li>
                  <li>Cost: ~$0.02 per 100 commits (GPT-4)</li>
                </ul>
              </Card>
            </TabsContent>

            <TabsContent value="anthropic" className="space-y-4">
              <Card className="p-6">
                <h3 className="font-semibold mb-3">Anthropic</h3>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li>Get API key from console.anthropic.com</li>
                  <li>Recommended models: claude-3.5-sonnet</li>
                  <li>Cost: ~$0.03 per 100 commits</li>
                </ul>
              </Card>
            </TabsContent>

            <TabsContent value="google" className="space-y-4">
              <Card className="p-6">
                <h3 className="font-semibold mb-3">Google</h3>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li>Get API key from Google AI Studio</li>
                  <li>Recommended models: gemini-pro</li>
                  <li>Cost: Free tier available</li>
                </ul>
              </Card>
            </TabsContent>

            <TabsContent value="deepseek" className="space-y-4">
              <Card className="p-6">
                <h3 className="font-semibold mb-3">DeepSeek</h3>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li>Cost-effective option</li>
                  <li>Get API key from deepseek.com</li>
                  <li>Cost: ~$0.01 per 100 commits</li>
                </ul>
              </Card>
            </TabsContent>

            <TabsContent value="ollama" className="space-y-4">
              <Card className="p-6">
                <h3 className="font-semibold mb-3">Ollama (Local, Free)</h3>
                <ul className="space-y-2 text-sm text-muted-foreground mb-4">
                  <li>Install: ollama.com/download</li>
                  <li>Run: ollama serve</li>
                  <li>Models: llama2, mistral, codellama</li>
                  <li>Cost: $0 (runs on your machine)</li>
                </ul>
                <CodeBlock language="bash" code="ollama serve" />
              </Card>
            </TabsContent>

            <TabsContent value="compatible" className="space-y-4">
              <Card className="p-6">
                <h3 className="font-semibold mb-3">OpenAI-Compatible</h3>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li>Any provider with OpenAI-compatible API</li>
                  <li>Custom endpoints supported</li>
                </ul>
              </Card>
            </TabsContent>
          </Tabs>
        </section>

        {/* Scheduling Guide */}
        <section id="scheduling" className="mb-16 scroll-mt-24">
          <h2 className="text-3xl font-bold mb-6">Scheduling Guide</h2>
          <div className="space-y-6">
            <div>
              <h3 className="text-xl font-semibold mb-3">Unix/Mac (Cron)</h3>
              <Card className="p-6">
                <div className="space-y-4">
                  <div>
                    <p className="text-sm font-medium mb-2">
                      Example schedules:
                    </p>
                    <CodeBlock
                      language="bash"
                      code={`# Daily at 6 PM
0 18 * * *

# Every 4 hours
0 */4 * * *

# Weekdays at noon
0 12 * * 1-5

# Multiple times: 9 AM and 5 PM
0 9,17 * * *`}
                    />
                  </div>
                </div>
              </Card>
            </div>

            <div>
              <h3 className="text-xl font-semibold mb-3">
                Windows (Task Scheduler)
              </h3>
              <Card className="p-6">
                <p className="text-sm text-muted-foreground">
                  CLI automatically sets up Task Scheduler when you configure a
                  schedule.
                </p>
              </Card>
            </div>
          </div>
        </section>

        {/* Privacy & Security */}
        <section id="privacy" className="mb-16 scroll-mt-24">
          <h2 className="text-3xl font-bold mb-6">Privacy & Security</h2>
          <div className="grid gap-4">
            <Card className="p-6">
              <div className="flex items-start gap-3">
                <Lock className="size-5 text-[var(--feature-accent)] mt-0.5 shrink-0" />
                <div>
                  <p className="text-sm">
                    CLI reads only git metadata (commit messages, dates,
                    authors)
                  </p>
                </div>
              </div>
            </Card>
            <Card className="p-6">
              <div className="flex items-start gap-3">
                <Shield className="size-5 text-[var(--feature-accent)] mt-0.5 shrink-0" />
                <div>
                  <p className="text-sm">Your code never leaves your machine</p>
                </div>
              </div>
            </Card>
            <Card className="p-6">
              <div className="flex items-start gap-3">
                <Lock className="size-5 text-[var(--feature-accent)] mt-0.5 shrink-0" />
                <div>
                  <p className="text-sm">
                    Token stored securely with file permissions 600
                  </p>
                </div>
              </div>
            </Card>
            <Card className="p-6">
              <div className="flex items-start gap-3">
                <Settings className="size-5 text-[var(--feature-accent)] mt-0.5 shrink-0" />
                <div>
                  <p className="text-sm">
                    You choose which LLM provider to use
                  </p>
                </div>
              </div>
            </Card>
            <Card className="p-6">
              <div className="flex items-start gap-3">
                <Zap className="size-5 text-[var(--feature-accent)] mt-0.5 shrink-0" />
                <div>
                  <p className="text-sm">
                    Open source - audit the code yourself
                  </p>
                </div>
              </div>
            </Card>
          </div>
        </section>

        {/* Troubleshooting */}
        <section id="troubleshooting" className="mb-16 scroll-mt-24">
          <h2 className="text-3xl font-bold mb-6">Troubleshooting</h2>
          <Card className="overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-muted">
                  <tr>
                    <th className="px-6 py-3 text-left text-sm font-semibold">
                      Issue
                    </th>
                    <th className="px-6 py-3 text-left text-sm font-semibold">
                      Solution
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  <tr>
                    <td className="px-6 py-4 text-sm">Command not found</td>
                    <td className="px-6 py-4 text-sm text-muted-foreground">
                      Run{' '}
                      <code className="bg-muted px-1 rounded">
                        npm install -g @bragdoc/cli
                      </code>
                    </td>
                  </tr>
                  <tr>
                    <td className="px-6 py-4 text-sm">Authentication failed</td>
                    <td className="px-6 py-4 text-sm text-muted-foreground">
                      Run{' '}
                      <code className="bg-muted px-1 rounded">
                        bragdoc logout
                      </code>{' '}
                      then{' '}
                      <code className="bg-muted px-1 rounded">
                        bragdoc login
                      </code>
                    </td>
                  </tr>
                  <tr>
                    <td className="px-6 py-4 text-sm">No commits found</td>
                    <td className="px-6 py-4 text-sm text-muted-foreground">
                      Check git identity matches config
                    </td>
                  </tr>
                  <tr>
                    <td className="px-6 py-4 text-sm">LLM error</td>
                    <td className="px-6 py-4 text-sm text-muted-foreground">
                      Verify API key with{' '}
                      <code className="bg-muted px-1 rounded">
                        bragdoc llm show
                      </code>
                    </td>
                  </tr>
                  <tr>
                    <td className="px-6 py-4 text-sm">Rate limit</td>
                    <td className="px-6 py-4 text-sm text-muted-foreground">
                      Reduce{' '}
                      <code className="bg-muted px-1 rounded">
                        maxCommitsPerBatch
                      </code>{' '}
                      in config
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </Card>
          <Card className="p-4 mt-4 bg-muted/50">
            <div className="flex items-center gap-2 text-sm">
              <AlertCircle className="size-4 text-muted-foreground" />
              <span className="text-muted-foreground">
                Log location:{' '}
                <code className="font-mono">~/.bragdoc/logs/combined.log</code>
              </span>
            </div>
          </Card>
        </section>

        {/* Bottom CTA */}
        <section className="mb-16">
          <Card className="p-8 bg-gradient-to-br from-[var(--feature-accent)]/10 to-transparent border-[var(--feature-accent)]/20">
            <div className="text-center max-w-2xl mx-auto">
              <h2 className="text-3xl font-bold mb-4">Install CLI Now</h2>
              <Card className="p-4 mb-6 bg-background">
                <CodeBlock language="bash" code="npm install -g @bragdoc/cli" />
              </Card>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <Button size="lg" className="min-w-[160px]">
                  <Download className="size-4 mr-2" />
                  Get Started
                </Button>
                <Button
                  variant="outline"
                  size="lg"
                  className="min-w-[160px] bg-transparent"
                >
                  View Quick Start Guide
                </Button>
              </div>
            </div>
          </Card>
        </section>
      </main>
    </div>
  );
}
