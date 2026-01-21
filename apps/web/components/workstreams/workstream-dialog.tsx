'use client';

import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader2 } from 'lucide-react';

import type { Workstream } from '@bragdoc/database';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';

import { ColorPicker } from './color-picker';
import {
  AchievementSelectionGrid,
  type AchievementForSelection,
} from './achievement-selection-grid';

const workstreamFormSchema = z.object({
  name: z
    .string()
    .min(1, 'Name is required')
    .max(256, 'Name must be under 256 characters'),
  description: z
    .string()
    .max(1000, 'Description must be under 1000 characters')
    .optional()
    .default(''),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Invalid color format'),
  selectedAchievementIds: z.array(z.string().uuid()).optional().default([]),
});

type WorkstreamFormData = z.infer<typeof workstreamFormSchema>;

interface WorkstreamDialogProps {
  mode: 'create' | 'edit';
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workstream?: Workstream | null;
  achievements?: AchievementForSelection[];
  onSubmit: (data: {
    name: string;
    description?: string;
    color: string;
    selectedAchievementIds?: string[];
  }) => Promise<void>;
}

export function WorkstreamDialog({
  mode,
  open,
  onOpenChange,
  workstream,
  achievements = [],
  onSubmit,
}: WorkstreamDialogProps) {
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<WorkstreamFormData>({
    resolver: zodResolver(workstreamFormSchema),
    defaultValues: {
      name: '',
      description: '',
      color: '#3B82F6',
      selectedAchievementIds: [],
    },
  });

  const descriptionValue = form.watch('description');
  const descriptionLength = (descriptionValue || '').length;

  // Reset form when dialog opens/closes or workstream changes
  useEffect(() => {
    if (open) {
      if (mode === 'edit' && workstream) {
        form.reset({
          name: workstream.name,
          description: workstream.description || '',
          color: workstream.color || '#3B82F6',
          selectedAchievementIds: [],
        });
      } else if (mode === 'create') {
        form.reset({
          name: '',
          description: '',
          color: '#3B82F6',
          selectedAchievementIds: [],
        });
        // Auto-focus name field in create mode
        setTimeout(() => {
          const nameInput = document.querySelector(
            'input[name="name"]',
          ) as HTMLInputElement;
          if (nameInput) {
            nameInput.focus();
          }
        }, 0);
      }
    }
  }, [open, mode, workstream, form]);

  const handleFormSubmit = async (data: WorkstreamFormData) => {
    setIsLoading(true);
    try {
      await onSubmit({
        name: data.name,
        description: data.description || undefined,
        color: data.color,
        selectedAchievementIds:
          mode === 'create' ? data.selectedAchievementIds : undefined,
      });
      onOpenChange(false);
      form.reset();
    } finally {
      setIsLoading(false);
    }
  };

  const isCreate = mode === 'create';
  const title = isCreate ? 'Add Workstream' : 'Edit Workstream';
  const description = isCreate
    ? 'Create a new workstream and assign achievements to it.'
    : 'Update the workstream details.';
  const submitLabel = isCreate ? 'Create Workstream' : 'Update Workstream';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={`overflow-hidden ${isCreate ? 'sm:max-w-xl' : 'sm:max-w-md'}`}
      >
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(handleFormSubmit)}
            className="space-y-4"
          >
            {/* Name Field */}
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="e.g., Performance Improvements"
                      {...field}
                      disabled={isLoading}
                      autoComplete="off"
                      data-1p-ignore
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Color Picker */}
            <FormField
              control={form.control}
              name="color"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Color</FormLabel>
                  <FormControl>
                    <ColorPicker
                      value={field.value}
                      onChange={field.onChange}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Description Field */}
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Description
                    <span className="text-xs text-muted-foreground ml-2">
                      {descriptionLength}/1000
                    </span>
                  </FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Optional description of this workstream"
                      {...field}
                      disabled={isLoading}
                      rows={3}
                      className="resize-none"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Achievement Selection Grid - Only in Create Mode */}
            {isCreate && (
              <FormField
                control={form.control}
                name="selectedAchievementIds"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Achievements</FormLabel>
                    <FormControl>
                      <AchievementSelectionGrid
                        achievements={achievements}
                        selectedIds={field.value || []}
                        onSelectionChange={field.onChange}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {/* Footer */}
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isLoading}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {isCreate ? 'Creating...' : 'Updating...'}
                  </>
                ) : (
                  submitLabel
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
