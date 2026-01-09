'use client';

import { useRef, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import type { MDXEditorMethods } from '@mdxeditor/editor';

// Dynamic import with SSR disabled - MDXEditor requires client-side only rendering
const MDXEditorWrapper = dynamic(
  () =>
    import('./mdx-editor-wrapper').then((mod) => ({
      default: mod.MDXEditorWrapper,
    })),
  {
    ssr: false,
    loading: () => (
      <div className="space-y-4 p-4">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-[400px] w-full" />
      </div>
    ),
  },
);

interface DocumentEditorProps {
  content: string;
  onChange: (content: string) => void;
  isGenerating?: boolean;
}

export function DocumentEditor({
  content,
  onChange,
  isGenerating = false,
}: DocumentEditorProps) {
  const editorRef = useRef<MDXEditorMethods>(null);

  // Update editor content when streaming new content during generation
  useEffect(() => {
    if (isGenerating && editorRef.current) {
      editorRef.current.setMarkdown(content);
    }
  }, [content, isGenerating]);

  return (
    <Card>
      <CardContent className="pt-4 lg:pt-6">
        <MDXEditorWrapper
          ref={editorRef}
          markdown={content}
          onChange={onChange}
          readOnly={isGenerating}
          className="mdx-editor-container"
        />
      </CardContent>
    </Card>
  );
}
