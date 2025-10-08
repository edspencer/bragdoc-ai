'use client';

import { useState } from 'react';
import { Button } from 'components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from 'components/ui/card';
import { Textarea } from 'components/ui/textarea';
import { IconRefresh, IconCheck, IconX, IconCopy } from '@tabler/icons-react';
import { toast } from 'sonner';

interface StandupUpdateSectionProps {
  standupId: string;
  selectedAchievements: string[];
  standupInstructions: string;
}

export function StandupUpdateSection({
  standupId,
  selectedAchievements,
  standupInstructions,
}: StandupUpdateSectionProps) {
  const [content, setContent] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [originalContent, setOriginalContent] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const handleGenerate = async () => {
    setIsGenerating(true);
    try {
      // Call API to generate standup update using AI
      const response = await fetch(
        `/api/standups/${standupId}/achievements-summary`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            achievementIds: selectedAchievements,
          }),
        },
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to generate standup update');
      }

      const data = await response.json();
      setContent(data.achievementsSummary || '');
      setOriginalContent(data.achievementsSummary || '');
      toast.success('Standup update generated');
    } catch (error) {
      console.error('Error generating standup update:', error);
      toast.error(
        error instanceof Error
          ? error.message
          : 'Failed to generate standup update',
      );
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      // Save standup update to database
      const response = await fetch(
        `/api/standups/${standupId}/achievements-summary`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            achievementIds: selectedAchievements,
            manualSummary: content, // Allow manual override
          }),
        },
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to save standup update');
      }

      toast.success('Standup update saved');
      setIsEditing(false);
      setOriginalContent(content);
    } catch (error) {
      console.error('Error saving standup update:', error);
      toast.error(
        error instanceof Error
          ? error.message
          : 'Failed to save standup update',
      );
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setContent(originalContent);
    setIsEditing(false);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(content);
    toast.success('Copied to clipboard');
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Standup Update</CardTitle>
          <div className="flex gap-2">
            {isEditing ? (
              <>
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
              </>
            ) : (
              <>
                {content && (
                  <Button size="sm" variant="outline" onClick={handleCopy}>
                    <IconCopy className="size-4" />
                  </Button>
                )}
                <Button
                  size="sm"
                  onClick={handleGenerate}
                  disabled={isGenerating || selectedAchievements.length === 0}
                >
                  <IconRefresh
                    className={`size-4 mr-2 ${isGenerating ? 'animate-spin' : ''}`}
                  />
                  {isGenerating ? 'Generating...' : 'Regenerate'}
                </Button>
              </>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Textarea
          value={content}
          onChange={(e) => {
            setContent(e.target.value);
            setIsEditing(true);
          }}
          placeholder={
            selectedAchievements.length === 0
              ? 'Select achievements from the table to generate a standup update'
              : 'Click Regenerate to generate your standup update based on selected achievements'
          }
          className="min-h-[300px] font-mono text-sm"
        />
        {selectedAchievements.length === 0 && (
          <p className="text-sm text-muted-foreground mt-2">
            Select one or more achievements from the Recent Achievements table
            to generate your standup update.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
