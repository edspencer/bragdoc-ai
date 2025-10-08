'use client';

import { useState } from 'react';
import { Button } from 'components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from 'components/ui/card';
import { Textarea } from 'components/ui/textarea';
import { IconCheck, IconX } from '@tabler/icons-react';
import { toast } from 'sonner';

interface WipSectionProps {
  standupId: string;
}

export function WipSection({ standupId }: WipSectionProps) {
  const [content, setContent] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [originalContent, setOriginalContent] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      // Save WIP to database
      const response = await fetch(`/api/standups/${standupId}/wip`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          wip: content,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to save WIP');
      }

      toast.success('WIP saved');
      setIsEditing(false);
      setOriginalContent(content);
    } catch (error) {
      console.error('Error saving WIP:', error);
      toast.error(
        error instanceof Error ? error.message : 'Failed to save WIP',
      );
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setContent(originalContent);
    setIsEditing(false);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Work In Progress (WIP)</CardTitle>
          {isEditing && (
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={handleCancel}
                disabled={isSaving}
              >
                <IconX className="size-4 mr-2" />
                Cancel
              </Button>
              <Button size="sm" onClick={handleSave} disabled={isSaving}>
                <IconCheck className="size-4 mr-2" />
                {isSaving ? 'Saving...' : 'Save'}
              </Button>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <Textarea
          value={content}
          onChange={(e) => {
            setContent(e.target.value);
            setIsEditing(true);
          }}
          placeholder="What are you currently working on? Add notes about ongoing tasks, blockers, or upcoming work..."
          className="min-h-[200px]"
        />
      </CardContent>
    </Card>
  );
}
