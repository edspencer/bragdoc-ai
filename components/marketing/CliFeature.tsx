'use client';

import { motion } from 'framer-motion';

interface CommandExample {
  command: string;
  description: string;
}

const commands: CommandExample[] = [
  {
    command: '$ bragdoc login',
    description: 'Authenticate securely with your bragdoc.ai account',
  },
  {
    command: '$ bragdoc repos add .',
    description: 'Start tracking this repo with bragdoc',
  },
  {
    command: '$ bragdoc extract',
    description: 'Turns your git history into bragdoc.ai achievements',
  },
];

export function CliFeature() {
  return (
    <section className="py-16 px-4 md:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Left side content */}
          <div>
            <h2 className="text-4xl font-bold tracking-tight mb-6">
              Are You a Software Engineer?
            </h2>
            <p className="text-lg mb-6 text-muted-foreground">
              Your git history is a goldmine of achievements. Our CLI tool
              automatically extracts meaningful accomplishments from your
              commits and pull requests, making it easier than ever to maintain
              your brag document.
            </p>
            <p className="text-lg mb-8 text-muted-foreground">
              Install globally with npm and start documenting your wins today:
            </p>
            <div className="bg-secondary/50 p-4 rounded-md mb-6">
              <code className="text-sm">npm install -g @bragdoc/cli</code>
            </div>
          </div>

          {/* Right side terminal */}
          <div className="relative">
            <div className="bg-background border rounded-lg shadow-lg">
              {/* Terminal header */}
              <div className="border-b px-4 py-2 flex items-center gap-2">
                <div className="flex gap-2">
                  <div className="size-3 rounded-full bg-red-500" />
                  <div className="size-3 rounded-full bg-yellow-500" />
                  <div className="size-3 rounded-full bg-green-500" />
                </div>
                <div className="flex-1 text-center text-sm text-muted-foreground">
                  terminal
                </div>
              </div>

              {/* Terminal content */}
              <div className="p-6 space-y-6">
                {commands.map((cmd, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.2 }}
                  >
                    <div className="font-mono text-sm mb-2">{cmd.command}</div>
                    <div className="text-sm text-muted-foreground">
                      {cmd.description}
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
