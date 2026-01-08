'use client';

import { useState, useEffect } from 'react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { Markdown } from '@/components/markdown';

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
  const [activeTab, setActiveTab] = useState('preview');

  // Force preview mode while generating
  useEffect(() => {
    if (isGenerating) {
      setActiveTab('preview');
    }
  }, [isGenerating]);

  return (
    <Card>
      <CardContent className="pt-4 lg:pt-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList>
            <TabsTrigger value="preview">Preview</TabsTrigger>
            <TabsTrigger value="edit" disabled={isGenerating}>
              Edit
            </TabsTrigger>
          </TabsList>

          <TabsContent value="preview" className="mt-4">
            <div className="prose prose-sm dark:prose-invert max-w-none">
              <Markdown>{content}</Markdown>
            </div>
          </TabsContent>

          <TabsContent value="edit" className="mt-4">
            <Textarea
              value={content}
              onChange={(e) => onChange(e.target.value)}
              className="min-h-[500px] resize-y font-mono text-sm"
              placeholder="Write your performance review in markdown..."
              aria-label="Performance review document editor"
            />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
