import type React from 'react';
import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CodeBlock } from '@/components/code-block';

export function PathASteps() {
  return (
    <Card>
      <CardContent className="p-6 sm:p-8">
        <div className="space-y-8">
          <StepItem
            number={1}
            title="Install CLI"
            time="1 minute"
            description="Install the BragDoc CLI globally using npm"
          >
            <CodeBlock
              language="bash"
              code={`npm install -g @bragdoc/cli
bragdoc --version`}
            />
          </StepItem>

          <StepItem
            number={2}
            title="Create Account"
            time="1 minute"
            description="Set up your free account"
          >
            <div className="flex justify-center my-4">
              <Link href="/register">
                <Button size="lg" className="text-lg px-8 py-6">
                  Create Account
                </Button>
              </Link>
            </div>
          </StepItem>

          <StepItem
            number={3}
            title="Authenticate"
            time="1 minute"
            description="Connect your CLI to your BragDoc account"
          >
            <CodeBlock
              language="bash"
              code={`bragdoc login
# Opens browser, redirects back to CLI`}
            />
          </StepItem>

          <StepItem
            number={4}
            title="Configure LLM"
            time="2 minutes"
            description="Choose Ollama for free local AI configuration"
          >
            <CodeBlock
              language="bash"
              code={`bragdoc llm set
# Select Ollama for free, local AI
# Enter API key (if cloud provider)`}
            />
          </StepItem>

          <StepItem
            number={5}
            title="Initialize First Project"
            time="1 minute"
            description="Set up BragDoc in your project directory"
          >
            <CodeBlock
              language="bash"
              code={`cd ~/projects/my-app
bragdoc init
# Confirm automatic extraction schedule`}
            />
          </StepItem>

          <StepItem
            number={6}
            title="Extract Achievements"
            time="1 minute"
            description="Run your first extraction and see your achievements"
          >
            <CodeBlock
              language="bash"
              code={`bragdoc extract
# See achievements extracted in terminal
# Check web app: app.bragdoc.ai/achievements`}
            />
          </StepItem>
        </div>
      </CardContent>
    </Card>
  );
}

function StepItem({
  number,
  title,
  time,
  description,
  children,
}: {
  number: number;
  title: string;
  time: string;
  description: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="flex gap-4 sm:gap-6">
      <div className="shrink-0">
        <div className="flex size-10 items-center justify-center rounded-full bg-primary text-primary-foreground font-bold text-lg">
          {number}
        </div>
      </div>
      <div className="flex-1 space-y-3">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h3 className="text-lg font-semibold">{title}</h3>
            <span className="text-sm text-muted-foreground">({time})</span>
          </div>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>
        {children}
      </div>
    </div>
  );
}
