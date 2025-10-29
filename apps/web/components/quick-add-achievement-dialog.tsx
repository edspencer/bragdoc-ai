'use client';

import * as React from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { IconPlus, IconStarFilled, IconStar } from '@tabler/icons-react';
import { useForm } from 'react-hook-form';
import { z } from 'zod/v3';

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
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { Project } from '@/database/schema';

const quickAddSchema = z.object({
  title: z.string().min(1, 'Achievement description is required'),
  projectId: z.string().nullable(),
  impact: z.number().min(1).max(10).default(5),
});

type QuickAddFormData = z.infer<typeof quickAddSchema>;

interface QuickAddAchievementDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projects?: Project[];
  onSubmit: (data: QuickAddFormData) => void;
}

function StarRating({
  rating,
  onRatingChange,
}: {
  rating: number;
  onRatingChange: (rating: number) => void;
}) {
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((star) => (
        <Button
          key={star}
          type="button"
          variant="ghost"
          size="icon"
          className="size-4 p-0 hover:bg-transparent"
          onClick={() => onRatingChange(star)}
        >
          {star <= rating ? (
            <IconStarFilled className="size-3 fill-yellow-400 text-yellow-400" />
          ) : (
            <IconStar className="size-3 text-muted-foreground hover:text-yellow-400" />
          )}
        </Button>
      ))}
    </div>
  );
}

export function QuickAddAchievementDialog({
  open,
  onOpenChange,
  projects,
  onSubmit,
}: QuickAddAchievementDialogProps) {
  const form = useForm<QuickAddFormData>({
    resolver: zodResolver(quickAddSchema),
    defaultValues: {
      title: '',
      projectId: null,
      impact: 5,
    },
  });

  // Load last selected project from localStorage
  React.useEffect(() => {
    if (open) {
      const lastProject = localStorage.getItem('lastSelectedProject');
      if (lastProject && projects?.find((p) => p.id === lastProject)) {
        form.setValue('projectId', lastProject);
      } else {
        form.setValue('projectId', null);
      }
    }
  }, [open, projects, form]);

  const handleSubmit = (data: QuickAddFormData) => {
    // Save last selected project to localStorage
    if (data.projectId) {
      localStorage.setItem('lastSelectedProject', data.projectId);
    }

    onSubmit(data);
    onOpenChange(false);
    form.reset();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <IconPlus className="size-5" />
            Quick Add Achievement
          </DialogTitle>
          <DialogDescription>
            Quickly log a new achievement to your brag document.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(handleSubmit)}
            className="space-y-4"
          >
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Achievement</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Describe your achievement..."
                      className="min-h-[80px]"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="projectId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Project</FormLabel>
                  <Select
                    value={field.value || 'none'}
                    onValueChange={(value) =>
                      field.onChange(value === 'none' ? null : value)
                    }
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select project" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="none">No project</SelectItem>
                      {projects?.map((project) => (
                        <SelectItem key={project.id} value={project.id}>
                          {project.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="impact"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Impact</FormLabel>
                  <FormControl>
                    <div className="flex items-center gap-2">
                      <StarRating
                        rating={field.value}
                        onRatingChange={field.onChange}
                      />
                      <span className="text-sm text-muted-foreground">
                        {field.value}/10
                      </span>
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button type="submit">
                <IconPlus className="size-4" />
                Add Achievement
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
