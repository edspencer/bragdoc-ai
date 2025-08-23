'use client';

import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneLight } from 'react-syntax-highlighter/dist/esm/styles/prism';
import useSWR from 'swr';

type PromptId =
  | 'extract-achievements'
  | 'extract-commit-achievements'
  | 'generate-document';

const fetcher = (url: string) => fetch(url).then((res) => res.text());

export function PrettyPrompt({ id }: { id: PromptId }) {
  const {
    data: prompt,
    isLoading,
    error,
  } = useSWR(`/api/prompts/${id}/mock`, fetcher, {
    revalidateOnMount: true,
  });

  if (isLoading) {
    return <div>Loading...</div>;
  }

  if (error) {
    return <div>Error loading prompt</div>;
  }

  return (
    <SyntaxHighlighter language="xml" style={oneLight} className="text-sm">
      {prompt || ''}
    </SyntaxHighlighter>
  );
}
