import { CodeBlock } from '@/components/code-block';

export function TechnicalDetails() {
  const codeExample = `// What CLI extracts (metadata only):
{
  commitHash: "a1b2c3d",
  message: "Add user authentication",
  date: "2025-01-15",
  author: "Your Name",
  filesChanged: ["auth.ts", "user.ts"]
}

// What is sent to your LLM:
"Analyze this commit message and extract achievements:
Commit: Add user authentication
Files: auth.ts, user.ts
Date: 2025-01-15"

// What your LLM returns:
"Implemented secure user authentication system"

// What is sent to BragDoc cloud:
{
  title: "Implemented secure user authentication system",
  date: "2025-01-15",
  impact: 8
}`;

  return (
    <section className="py-12 sm:py-16 bg-muted/30">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl sm:text-3xl font-bold text-center mb-6">
            How It Works - Technical Details
          </h2>
          <p className="text-center text-muted-foreground mb-8 text-balance">
            See exactly what data flows through each layer of the system
          </p>
          <CodeBlock code={codeExample} language="typescript" />
        </div>
      </div>
    </section>
  );
}
