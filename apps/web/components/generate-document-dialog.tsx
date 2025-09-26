'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { FileText, Calendar, BarChart3, Edit3, Loader2 } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import type { Achievement } from '@/lib/db/schema';

interface GenerateDocumentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedAchievements: Achievement[];
}

const documentTypes = [
  {
    id: 'standup',
    title: 'Standup',
    description: 'Daily standup update format',
    icon: Calendar,
    prompt:
      "Generate a concise daily standup update based on these achievements. Format it as: What I accomplished, What I'm working on next, Any blockers or challenges.",
  },
  {
    id: 'weekly',
    title: 'Weekly Summary',
    description: 'Weekly progress summary',
    icon: BarChart3,
    prompt:
      'Create a comprehensive weekly summary highlighting key achievements, progress made, and impact delivered. Include metrics and outcomes where relevant.',
  },
  {
    id: 'summary',
    title: 'Summary',
    description: 'General achievement summary',
    icon: FileText,
    prompt:
      'Generate a professional summary of these achievements, highlighting the impact and value delivered. Focus on outcomes and business value.',
  },
  {
    id: 'custom',
    title: 'Custom',
    description: 'Custom prompt',
    icon: Edit3,
    prompt: '',
  },
];

export function GenerateDocumentDialog({
  open,
  onOpenChange,
  selectedAchievements,
}: GenerateDocumentDialogProps) {
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [customPrompt, setCustomPrompt] = useState('');
  const [editablePrompt, setEditablePrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedDocument, setGeneratedDocument] = useState('');

  const handleTypeSelect = (typeId: string) => {
    setSelectedType(typeId);
    const type = documentTypes.find((t) => t.id === typeId);
    if (type) {
      setEditablePrompt(type.prompt);
    }
  };

  const handleGenerate = async () => {
    if (!selectedType) {
      toast({
        title: 'Please select a document type',
        variant: 'destructive',
      });
      return;
    }

    const prompt = selectedType === 'custom' ? customPrompt : editablePrompt;
    if (!prompt.trim()) {
      toast({
        title: 'Please provide a prompt',
        variant: 'destructive',
      });
      return;
    }

    setIsGenerating(true);

    try {
      // Format achievements for the AI
      const achievementsText = selectedAchievements
        .map((achievement) => {
          const projectInfo = 'No project';
          // const projectInfo = achievement.project
          //   ? `${achievement.project.name}${achievement.project.company ? ` (${achievement.project.company.name})` : ''}`
          //   : 'No project';

          return `- ${achievement.title}${achievement.summary ? `: ${achievement.summary}` : ''} (${achievement.impact} impact points, ${projectInfo})`;
        })
        .join('\n');

      const fullPrompt = `${prompt}\n\nAchievements:\n${achievementsText}`;

      // Call AI API to generate document
      const response = await fetch('/api/generate-document', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt: fullPrompt,
          achievements: selectedAchievements,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate document');
      }

      const data = await response.json();
      setGeneratedDocument(data.document);

      toast({
        title: 'Document generated successfully',
        description: 'Your document is ready!',
      });
    } catch (error) {
      console.error('Error generating document:', error);
      toast({
        title: 'Failed to generate document',
        description: 'Please try again later.',
        variant: 'destructive',
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleClose = () => {
    setSelectedType(null);
    setCustomPrompt('');
    setEditablePrompt('');
    setGeneratedDocument('');
    onOpenChange(false);
  };

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(generatedDocument);
      toast({
        title: 'Copied to clipboard',
        description: 'Document copied successfully!',
      });
    } catch (error) {
      toast({
        title: 'Failed to copy',
        description: 'Please copy manually.',
        variant: 'destructive',
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Generate Document</DialogTitle>
          <DialogDescription>
            Generate a document from {selectedAchievements.length} selected
            achievement
            {selectedAchievements.length !== 1 ? 's' : ''}
          </DialogDescription>
        </DialogHeader>

        {!generatedDocument ? (
          <div className="space-y-6">
            {/* Document Type Selection */}
            <div className="space-y-3">
              <Label className="text-base font-medium">
                Select Document Type
              </Label>
              <div className="grid grid-cols-2 gap-3">
                {documentTypes.map((type) => {
                  const Icon = type.icon;
                  return (
                    <Card
                      key={type.id}
                      className={`cursor-pointer transition-colors hover:bg-accent ${
                        selectedType === type.id ? 'ring-2 ring-primary' : ''
                      }`}
                      onClick={() => handleTypeSelect(type.id)}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-start space-x-3">
                          <Icon className="h-5 w-5 mt-0.5 text-muted-foreground" />
                          <div className="space-y-1">
                            <h4 className="font-medium">{type.title}</h4>
                            <p className="text-sm text-muted-foreground">
                              {type.description}
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>

            {/* Prompt Editing */}
            {selectedType && (
              <div className="space-y-3">
                <Label className="text-base font-medium">
                  {selectedType === 'custom'
                    ? 'Custom Prompt'
                    : 'Edit Prompt (Optional)'}
                </Label>
                <Textarea
                  placeholder={
                    selectedType === 'custom'
                      ? 'Enter your custom prompt...'
                      : 'Edit the default prompt if needed...'
                  }
                  value={
                    selectedType === 'custom' ? customPrompt : editablePrompt
                  }
                  onChange={(e) =>
                    selectedType === 'custom'
                      ? setCustomPrompt(e.target.value)
                      : setEditablePrompt(e.target.value)
                  }
                  rows={4}
                  className="resize-none"
                />
              </div>
            )}

            {/* Selected Achievements Preview */}
            <div className="space-y-3">
              <Label className="text-base font-medium">
                Selected Achievements
              </Label>
              <div className="max-h-32 overflow-y-auto border rounded-md p-3 bg-muted/50">
                {selectedAchievements.map((achievement) => (
                  <div key={achievement.id} className="text-sm py-1">
                    <span className="font-medium">{achievement.title}</span>
                    {achievement.projectId && (
                      <span className="text-muted-foreground ml-2">
                        ({achievement.projectId})
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          /* Generated Document Display */
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label className="text-base font-medium">
                Generated Document
              </Label>
              <Button variant="outline" size="sm" onClick={copyToClipboard}>
                Copy to Clipboard
              </Button>
            </div>
            <div className="border rounded-md p-4 bg-muted/50 max-h-96 overflow-y-auto">
              <pre className="whitespace-pre-wrap text-sm font-mono">
                {generatedDocument}
              </pre>
            </div>
          </div>
        )}

        <DialogFooter>
          {!generatedDocument ? (
            <>
              <Button variant="outline" onClick={handleClose}>
                Cancel
              </Button>
              <Button
                onClick={handleGenerate}
                disabled={!selectedType || isGenerating}
              >
                {isGenerating && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Generate
              </Button>
            </>
          ) : (
            <>
              <Button
                variant="outline"
                onClick={() => setGeneratedDocument('')}
              >
                Generate Another
              </Button>
              <Button onClick={handleClose}>Done</Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
