import type React from 'react';
import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { TerminalScreenshot } from '@/components/terminal-screenshot';

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
            <TerminalScreenshot
              src="/screenshots/terminal/npm-install-bragdoc-cli.png"
              alt="Terminal showing npm install -g @bragdoc/cli command and version check"
              width={1200}
              height={800}
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
            <TerminalScreenshot
              src="/screenshots/terminal/bragdoc-login.png"
              alt="Terminal showing bragdoc login command with browser authentication flow"
              width={1200}
              height={800}
            />
          </StepItem>

          <StepItem
            number={4}
            title="Initialize First Project"
            time="1 minute"
            description="Set up BragDoc in your project directory"
          >
            <TerminalScreenshot
              src="/screenshots/terminal/bragdoc-init.png"
              alt="Terminal showing bragdoc init command with repository setup and scheduling"
              width={1200}
              height={800}
            />
          </StepItem>

          <StepItem
            number={5}
            title="Extract Achievements"
            time="1 minute"
            description="Run your first extraction and see your achievements"
          >
            <TerminalScreenshot
              src="/screenshots/terminal/bragdoc-extract.png"
              alt="Terminal showing bragdoc extract command with achievement extraction results"
              width={1200}
              height={800}
            />
          </StepItem>

          <StepItem
            number={6}
            title="See Your Impact"
            time="Ongoing"
            description="Log in to the web app to view, organize, and share your achievements"
          >
            <div className="space-y-4">
              <div className="flex justify-center">
                <Link href="https://app.bragdoc.com/dashboard">
                  <Button size="lg" className="text-lg px-8 py-6">
                    Go to Dashboard
                  </Button>
                </Link>
              </div>
              <div className="flex justify-center">
                <Link
                  href="https://app.bragdoc.com/dashboard"
                  className="block rounded-lg overflow-hidden border border-border hover:border-primary transition-colors max-w-[650px]"
                >
                  <TerminalScreenshot
                    src="/screenshots/ui/hero.png"
                    alt="BragDoc dashboard showing achievements and projects"
                    width={1200}
                    height={800}
                  />
                </Link>
              </div>
            </div>
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
