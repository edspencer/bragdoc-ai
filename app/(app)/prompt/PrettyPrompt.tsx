'use client';

import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneLight } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { useEffect, useState } from 'react';

type PromptId =
  | 'extract-achievements'
  | 'extract-commit-achievements'
  | 'generate-document';

export function PrettyPrompt({ id }: { id: PromptId }) {
  const [prompt, setPrompt] = useState<string>('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchPrompt() {
      try {
        const response = await fetch(`/api/prompts/${id}/user`);
        const text = await response.text();
        setPrompt(text);
      } catch (error) {
        console.error('Error fetching prompt:', error);
        setPrompt('Error loading prompt');
      } finally {
        setLoading(false);
      }
    }

    fetchPrompt();
  }, [id]);

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <SyntaxHighlighter language="xml" style={oneLight}>
      {prompt}
    </SyntaxHighlighter>
  );
}
