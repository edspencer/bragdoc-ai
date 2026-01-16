'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
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
import type { AchievementWithRelationsUI } from '@/lib/types/achievement';

// Backend API types
type DocumentType =
  | 'weekly_report'
  | 'monthly_report'
  | 'custom_report'
  | 'quarterly_report'
  | 'performance_review';

interface GenerateDocumentRequest {
  achievementIds: string[];
  type: DocumentType;
  title: string;
  userInstructions?: string;
  defaultInstructions?: string;
}

interface GenerateDocumentResponse {
  document: {
    id: string;
    title: string;
    content: string;
    type: string | null;
    userId: string;
    createdAt: Date;
    updatedAt: Date;
    chatId: string | null;
    companyId: string | null;
    kind: string;
    shareToken: string | null;
  };
}

interface GenerateDocumentError {
  error: string;
  details?: any;
}

/**
 * Maps frontend document type IDs to backend DocumentType enum values
 */
function mapFrontendTypeToBackend(frontendType: string): DocumentType {
  const mapping: Record<string, DocumentType> = {
    standup: 'weekly_report',
    weekly: 'weekly_report',
    summary: 'monthly_report',
    custom: 'custom_report',
  };

  return mapping[frontendType] || 'custom_report';
}

/**
 * Generates a document title based on type and current date
 */
function generateDocumentTitle(frontendType: string): string {
  const now = new Date();
  // Using en-US locale for consistent formatting across all users
  const dateStr = now.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  const titleMap: Record<string, string> = {
    standup: `Standup - ${dateStr}`,
    weekly: `Weekly Report - ${dateStr}`,
    summary: `Summary - ${dateStr}`,
    custom: `Custom Report - ${dateStr}`,
  };

  return titleMap[frontendType] || `Document - ${dateStr}`;
}

interface GenerateDocumentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedAchievements: AchievementWithRelationsUI[];
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
  const router = useRouter();
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [customPrompt, setCustomPrompt] = useState('');
  const [editablePrompt, setEditablePrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);

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
    if (selectedType !== 'custom' && !prompt.trim()) {
      toast({
        title: 'Please provide a prompt',
        variant: 'destructive',
      });
      return;
    }

    setIsGenerating(true);

    try {
      // Get the original prompt for the selected type as default instructions
      const selectedTypeData = documentTypes.find((t) => t.id === selectedType);
      const defaultInstructions = selectedTypeData?.prompt || '';

      // Build the request payload matching backend schema
      const requestBody: GenerateDocumentRequest = {
        achievementIds: selectedAchievements.map((a) => a.id),
        type: mapFrontendTypeToBackend(selectedType),
        title: generateDocumentTitle(selectedType),
        userInstructions: prompt,
        // Only include defaultInstructions if user has modified the prompt
        defaultInstructions:
          prompt !== defaultInstructions ? defaultInstructions : undefined,
      };

      // Call the correct backend endpoint
      const response = await fetch('/api/documents/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      // Handle errors
      if (!response.ok) {
        let errorData: GenerateDocumentError;
        try {
          errorData = await response.json();
        } catch {
          // Fallback if response isn't JSON (e.g., 500 with HTML error page)
          errorData = { error: 'An unexpected error occurred' };
        }

        if (response.status === 401) {
          throw new Error('You must be logged in to generate documents');
        } else if (response.status === 400) {
          throw new Error(
            errorData.error || 'Invalid request. Please check your selections.',
          );
        } else {
          throw new Error(errorData.error || 'Failed to generate document');
        }
      }

      // Parse successful response
      const data: GenerateDocumentResponse = await response.json();
      const documentId = data.document.id;

      toast({
        title: 'Document generated successfully',
        description: 'Redirecting to your reports...',
      });

      // Close dialog and redirect to new document detail page
      handleClose();

      // Navigate to the newly created document
      router.push(`/reports/${documentId}`);
    } catch (error) {
      console.error('Error generating document:', error);
      toast({
        title: 'Failed to generate document',
        description:
          error instanceof Error ? error.message : 'Please try again later.',
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
    onOpenChange(false);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(newOpen) => {
        // Prevent closing during generation
        if (!newOpen && !isGenerating) {
          handleClose();
        }
      }}
    >
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Generate Document</DialogTitle>
          <DialogDescription>
            {isGenerating
              ? `Generating document from ${selectedAchievements.length} achievements... This may take 10-30 seconds.`
              : `Generate a document from ${selectedAchievements.length} selected achievement${selectedAchievements.length !== 1 ? 's' : ''}`}
          </DialogDescription>
        </DialogHeader>

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
                    } ${isGenerating ? 'opacity-50 pointer-events-none' : ''}`}
                    onClick={() => !isGenerating && handleTypeSelect(type.id)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start space-x-3">
                        <Icon className="size-5 mt-0.5 text-muted-foreground" />
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
                  ? 'Custom Prompt (Optional)'
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
                disabled={isGenerating}
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

        <DialogFooter>
          <Button
            variant="outline"
            onClick={handleClose}
            disabled={isGenerating}
          >
            Cancel
          </Button>
          <Button
            onClick={handleGenerate}
            disabled={!selectedType || isGenerating}
          >
            {isGenerating && <Loader2 className="mr-2 size-4 animate-spin" />}
            {isGenerating ? 'Generating...' : 'Generate'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
