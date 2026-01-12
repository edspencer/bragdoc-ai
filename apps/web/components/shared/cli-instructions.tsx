'use client';

/**
 * Reusable CLI installation and usage instructions.
 *
 * Use this component anywhere you need to show users how to install
 * and use the bragdoc CLI to extract achievements.
 */
export function CliInstructions() {
  return (
    <div className="space-y-3">
      <div>
        <h3 className="font-semibold mb-1">1. Install the CLI</h3>
        <code className="block bg-muted px-3 py-2 rounded-md text-sm">
          npm install -g @bragdoc/cli
        </code>
      </div>
      <div>
        <h3 className="font-semibold mb-1">2. Login</h3>
        <code className="block bg-muted px-3 py-2 rounded-md text-sm">
          bragdoc login
        </code>
      </div>
      <div>
        <h3 className="font-semibold mb-1">3. Initialize a repository</h3>
        <code className="block bg-muted px-3 py-2 rounded-md text-sm">
          bragdoc init
        </code>
        <p className="text-sm text-muted-foreground mt-1">
          Run this command inside your Git repository
        </p>
      </div>
      <div>
        <h3 className="font-semibold mb-1">4. Extract achievements</h3>
        <code className="block bg-muted px-3 py-2 rounded-md text-sm">
          bragdoc extract
        </code>
      </div>
    </div>
  );
}
