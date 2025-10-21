import {
  Github,
  Database,
  Key,
  Shield,
  Terminal,
  CheckCircle2,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { CodeBlock } from '@/components/code-block';

export function SelfHostingSteps() {
  return (
    <section className="py-16 sm:py-20 lg:py-24">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">
              Step-by-Step Setup Guide
            </h2>
            <p className="text-lg text-muted-foreground">
              Get BragDoc running on your infrastructure in under 30 minutes
            </p>
          </div>

          <div className="space-y-8">
            {/* Step 1: Clone Repository */}
            <Card className="border-2">
              <CardContent className="pt-6">
                <div className="flex items-start gap-4 mb-4">
                  <div className="flex-shrink-0 h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center">
                    <Github className="h-6 w-6 text-primary" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="text-2xl font-bold text-primary">1</span>
                      <h3 className="text-xl font-bold">
                        Clone the Repository
                      </h3>
                    </div>
                    <p className="text-muted-foreground mb-4">
                      Start by cloning the BragDoc repository from GitHub to
                      your local machine or server.
                    </p>
                    <CodeBlock
                      language="bash"
                      code={`git clone https://github.com/yourusername/bragdoc.git
cd bragdoc`}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Step 2: Install Dependencies */}
            <Card className="border-2">
              <CardContent className="pt-6">
                <div className="flex items-start gap-4 mb-4">
                  <div className="flex-shrink-0 h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center">
                    <Terminal className="h-6 w-6 text-primary" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="text-2xl font-bold text-primary">2</span>
                      <h3 className="text-xl font-bold">
                        Install Dependencies
                      </h3>
                    </div>
                    <p className="text-muted-foreground mb-4">
                      BragDoc uses pnpm for package management. Install all
                      required dependencies.
                    </p>
                    <CodeBlock language="bash" code={`pnpm install`} />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Step 3: Set Up Database */}
            <Card className="border-2">
              <CardContent className="pt-6">
                <div className="flex items-start gap-4 mb-4">
                  <div className="flex-shrink-0 h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center">
                    <Database className="h-6 w-6 text-primary" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="text-2xl font-bold text-primary">3</span>
                      <h3 className="text-xl font-bold">
                        Set Up Neon Database
                      </h3>
                    </div>
                    <p className="text-muted-foreground mb-4">
                      Create a Neon PostgreSQL database for storing your
                      achievements. Sign up at{' '}
                      <a
                        href="https://neon.tech"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary hover:underline"
                      >
                        neon.tech
                      </a>{' '}
                      and create a new project.
                    </p>
                    <div className="space-y-3">
                      <div className="flex items-start gap-2 text-sm">
                        <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400 mt-0.5 flex-shrink-0" />
                        <span>Create a new Neon project</span>
                      </div>
                      <div className="flex items-start gap-2 text-sm">
                        <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400 mt-0.5 flex-shrink-0" />
                        <span>Copy your connection string</span>
                      </div>
                      <div className="flex items-start gap-2 text-sm">
                        <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400 mt-0.5 flex-shrink-0" />
                        <span>
                          Add it to your environment variables (see next step)
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Step 4: Configure Environment Variables */}
            <Card className="border-2">
              <CardContent className="pt-6">
                <div className="flex items-start gap-4 mb-4">
                  <div className="flex-shrink-0 h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center">
                    <Key className="h-6 w-6 text-primary" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="text-2xl font-bold text-primary">4</span>
                      <h3 className="text-xl font-bold">
                        Configure Environment Variables
                      </h3>
                    </div>
                    <p className="text-muted-foreground mb-4">
                      Create a{' '}
                      <code className="px-2 py-1 rounded bg-muted text-sm">
                        .env.local
                      </code>{' '}
                      file in the root directory with the following variables:
                    </p>
                    <CodeBlock
                      language="bash"
                      code={`# Database
DATABASE_URL="postgresql://user:password@host/database"

# Authentication (see step 5)
AUTH_SECRET="your-random-secret-key"
GOOGLE_CLIENT_ID="your-google-client-id"
GOOGLE_CLIENT_SECRET="your-google-client-secret"
# OR for GitHub auth:
GITHUB_CLIENT_ID="your-github-client-id"
GITHUB_CLIENT_SECRET="your-github-client-secret"

# App Configuration
NEXT_PUBLIC_APP_URL="http://localhost:3000"

# Optional: LLM Configuration (for AI features)
OPENAI_API_KEY="your-openai-api-key"
# OR use local Ollama (no API key needed)`}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Step 5: Set Up Authentication */}
            <Card className="border-2">
              <CardContent className="pt-6">
                <div className="flex items-start gap-4 mb-4">
                  <div className="flex-shrink-0 h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center">
                    <Shield className="h-6 w-6 text-primary" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="text-2xl font-bold text-primary">5</span>
                      <h3 className="text-xl font-bold">
                        Set Up OAuth Authentication
                      </h3>
                    </div>
                    <p className="text-muted-foreground mb-4">
                      BragDoc uses OAuth for authentication. Choose either
                      Google or GitHub (or both).
                    </p>

                    <div className="space-y-6">
                      {/* Google OAuth */}
                      <div className="p-4 rounded-lg bg-muted/50 border">
                        <h4 className="font-semibold mb-3">
                          Google OAuth Setup
                        </h4>
                        <ol className="space-y-2 text-sm list-decimal list-inside">
                          <li>
                            Go to{' '}
                            <a
                              href="https://console.cloud.google.com"
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-primary hover:underline"
                            >
                              Google Cloud Console
                            </a>
                          </li>
                          <li>
                            Create a new project or select an existing one
                          </li>
                          <li>Enable the Google+ API</li>
                          <li>
                            Go to Credentials → Create Credentials → OAuth
                            client ID
                          </li>
                          <li>Set application type to "Web application"</li>
                          <li>
                            Add authorized redirect URI:{' '}
                            <code className="px-2 py-0.5 rounded bg-background text-xs">
                              http://localhost:3000/api/auth/callback/google
                            </code>
                          </li>
                          <li>
                            Copy the Client ID and Client Secret to your
                            .env.local file
                          </li>
                        </ol>
                      </div>

                      {/* GitHub OAuth */}
                      <div className="p-4 rounded-lg bg-muted/50 border">
                        <h4 className="font-semibold mb-3">
                          GitHub OAuth Setup
                        </h4>
                        <ol className="space-y-2 text-sm list-decimal list-inside">
                          <li>
                            Go to{' '}
                            <a
                              href="https://github.com/settings/developers"
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-primary hover:underline"
                            >
                              GitHub Developer Settings
                            </a>
                          </li>
                          <li>Click "New OAuth App"</li>
                          <li>
                            Set Homepage URL to{' '}
                            <code className="px-2 py-0.5 rounded bg-background text-xs">
                              http://localhost:3000
                            </code>
                          </li>
                          <li>
                            Set Authorization callback URL to{' '}
                            <code className="px-2 py-0.5 rounded bg-background text-xs">
                              http://localhost:3000/api/auth/callback/github
                            </code>
                          </li>
                          <li>
                            Copy the Client ID and generate a Client Secret
                          </li>
                          <li>Add both to your .env.local file</li>
                        </ol>
                      </div>

                      <p className="text-sm text-muted-foreground">
                        For more details, see the{' '}
                        <a
                          href="https://authjs.dev/getting-started/providers/oauth-tutorial"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary hover:underline"
                        >
                          Auth.js OAuth documentation
                        </a>
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Step 6: Run Database Migrations */}
            <Card className="border-2">
              <CardContent className="pt-6">
                <div className="flex items-start gap-4 mb-4">
                  <div className="flex-shrink-0 h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center">
                    <Database className="h-6 w-6 text-primary" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="text-2xl font-bold text-primary">6</span>
                      <h3 className="text-xl font-bold">
                        Run Database Migrations
                      </h3>
                    </div>
                    <p className="text-muted-foreground mb-4">
                      Set up the database schema by running the migrations.
                    </p>
                    <CodeBlock
                      language="bash"
                      code={`pnpm db:migrate
pnpm db:seed  # Optional: seed with sample data`}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Step 7: Start the Application */}
            <Card className="border-2 border-green-500/50 bg-green-500/5">
              <CardContent className="pt-6">
                <div className="flex items-start gap-4 mb-4">
                  <div className="flex-shrink-0 h-12 w-12 rounded-xl bg-green-500/10 flex items-center justify-center">
                    <CheckCircle2 className="h-6 w-6 text-green-600 dark:text-green-400" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="text-2xl font-bold text-green-600 dark:text-green-400">
                        7
                      </span>
                      <h3 className="text-xl font-bold">
                        Start the Application
                      </h3>
                    </div>
                    <p className="text-muted-foreground mb-4">
                      You're all set! Start the development server and access
                      BragDoc at localhost:3000
                    </p>
                    <CodeBlock language="bash" code={`pnpm dev`} />
                    <p className="text-sm text-muted-foreground mt-4">
                      For production deployment, use{' '}
                      <code className="px-2 py-0.5 rounded bg-muted">
                        pnpm build
                      </code>{' '}
                      followed by{' '}
                      <code className="px-2 py-0.5 rounded bg-muted">
                        pnpm start
                      </code>
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Step 8: Configure CLI */}
            <Card className="border-2 border-green-500/50 bg-green-500/5">
              <CardContent className="pt-6">
                <div className="flex items-start gap-4 mb-4">
                  <div className="flex-shrink-0 h-12 w-12 rounded-xl bg-green-500/10 flex items-center justify-center">
                    <Terminal className="h-6 w-6 text-green-600 dark:text-green-400" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="text-2xl font-bold text-green-600 dark:text-green-400">
                        8
                      </span>
                      <h3 className="text-xl font-bold">
                        Configure CLI to Use Your Local Instance
                      </h3>
                    </div>
                    <p className="text-muted-foreground mb-4">
                      Update your BragDoc CLI configuration to point to your
                      self-hosted instance instead of the cloud version.
                    </p>

                    <div className="space-y-4">
                      <div>
                        <p className="text-sm font-medium mb-2">
                          Edit your BragDoc config file located at{' '}
                          <code className="px-2 py-0.5 rounded bg-muted text-xs">
                            ~/.bragdoc/config.yaml
                          </code>
                          :
                        </p>
                        <CodeBlock
                          language="yaml"
                          code={`settings:
  apiBaseUrl: http://localhost:3000
  maxCommitsPerBatch: 10
  defaultMaxCommits: 300`}
                        />
                      </div>

                      <div className="p-4 rounded-lg bg-muted/50 border">
                        <h4 className="font-semibold mb-2 text-sm">
                          Configuration Options
                        </h4>
                        <ul className="space-y-2 text-sm">
                          <li className="flex items-start gap-2">
                            <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400 mt-0.5 flex-shrink-0" />
                            <span>
                              <code className="px-1.5 py-0.5 rounded bg-background text-xs">
                                apiBaseUrl
                              </code>{' '}
                              - Point to your local instance (e.g.,
                              http://localhost:3000)
                            </span>
                          </li>
                          <li className="flex items-start gap-2">
                            <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400 mt-0.5 flex-shrink-0" />
                            <span>
                              <code className="px-1.5 py-0.5 rounded bg-background text-xs">
                                maxCommitsPerBatch
                              </code>{' '}
                              - Number of commits to process at once
                            </span>
                          </li>
                          <li className="flex items-start gap-2">
                            <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400 mt-0.5 flex-shrink-0" />
                            <span>
                              <code className="px-1.5 py-0.5 rounded bg-background text-xs">
                                defaultMaxCommits
                              </code>{' '}
                              - Default limit for commit extraction
                            </span>
                          </li>
                        </ul>
                      </div>

                      <p className="text-sm text-muted-foreground">
                        After updating the config, the CLI will communicate with
                        your self-hosted instance instead of the cloud version.
                        You can now use all CLI commands with your local BragDoc
                        installation!
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </section>
  );
}
