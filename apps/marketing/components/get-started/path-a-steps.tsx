import type React from 'react';
import { Card, CardContent } from '@/components/ui/card';
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
            number={3}
            title="Configure LLM"
            time="2 minutes"
            description="Set up your preferred AI provider (we recommend Ollama for free/local)"
          >
            <CodeBlock
              language="bash"
              code={`bragdoc llm set
# Choose provider (recommend Ollama for free/local)
# Enter API key (if cloud provider)`}
            />
          </StepItem>

          <StepItem
            number={4}
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
            number={5}
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
      <div className="flex-shrink-0">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-primary-foreground font-bold text-lg">
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
