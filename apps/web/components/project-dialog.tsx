'use client';

import * as React from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { IconFolderCode, IconCalendar } from '@tabler/icons-react';
import { format } from 'date-fns';
import { useForm } from 'react-hook-form';
import { z } from 'zod/v3';

import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
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
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

import type { Company } from '@/database/schema';
import type { ProjectWithCompany } from '@/database/projects/queries';
import { ColorPicker } from '@/components/ui/color-picker';
import { getNextProjectColor } from '@/lib/colors';

const projectSchema = z.object({
  name: z.string().min(1, 'Project name is required'),
  description: z.string().optional(),
  status: z.enum(['active', 'completed', 'archived']),
  color: z.string().min(1, 'Color is required'),
  startDate: z.date({
    required_error: 'Start date is required',
  }),
  endDate: z.date().optional(),
  repoRemoteUrl: z
    .string()
    .url('Must be a valid URL')
    .optional()
    .or(z.literal('')),
  companyId: z.string().optional(),
  isActive: z.boolean().default(false),
});

type ProjectFormData = z.infer<typeof projectSchema>;

interface ProjectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  project?: ProjectWithCompany | null;
  companies: Company[];
  onSubmit: (data: any) => void;
  isLoading?: boolean;
  existingProjectCount?: number;
}

export function ProjectDialog({
  open,
  onOpenChange,
  project,
  companies,
  onSubmit,
  isLoading = false,
  existingProjectCount = 0,
}: ProjectDialogProps) {
  const isEditing = !!project;

  const form = useForm<ProjectFormData>({
    resolver: zodResolver(projectSchema),
    defaultValues: {
      name: '',
      description: '',
      status: 'active',
      color: getNextProjectColor(existingProjectCount).hex,
      startDate: new Date(),
      endDate: undefined,
      repoRemoteUrl: '',
      companyId: '',
      isActive: false,
    },
  });

  const isActive = form.watch('isActive');
  const status = form.watch('status');

  // Reset form when dialog opens/closes or project changes
  React.useEffect(() => {
    if (open) {
      if (project) {
        form.reset({
          name: project.name,
          description: project.description || '',
          status: project.status as any,
          color: project.color || getNextProjectColor(0).hex,
          startDate: project.startDate,
          endDate: project.endDate || undefined,
          repoRemoteUrl: project.repoRemoteUrl || '',
          companyId: project.companyId || '',
          isActive: project.status === 'active' && !project.endDate,
        });
      } else {
        form.reset({
          name: '',
          description: '',
          status: 'active',
          color: getNextProjectColor(existingProjectCount).hex,
          startDate: new Date(),
          endDate: undefined,
          repoRemoteUrl: '',
          companyId: '',
          isActive: false,
        });
      }
    }
  }, [open, project, form, existingProjectCount]);

  // Handle active status changes
  React.useEffect(() => {
    if (isActive) {
      form.setValue('status', 'active');
      form.setValue('endDate', undefined);
    }
  }, [isActive, form]);

  // Clear end date when status is active
  React.useEffect(() => {
    if (status === 'active') {
      form.setValue('endDate', undefined);
    }
  }, [status, form]);

  const handleSubmit = (data: ProjectFormData) => {
    const { isActive, ...projectData } = data;
    onSubmit({
      ...projectData,
      description: projectData.description || null,
      endDate: data.status === 'active' ? null : projectData.endDate || null,
      repoRemoteUrl: projectData.repoRemoteUrl || null,
      companyId: projectData.companyId || null,
      createdAt: new Date(),
      updatedAt: new Date(),
      userId: '1',
    });
    onOpenChange(false);
    form.reset();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <IconFolderCode className="size-5" />
            {isEditing ? 'Edit Project' : 'Add Project'}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? 'Update the project information below.'
              : 'Add a new project to track your work.'}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(handleSubmit)}
            className="space-y-4"
          >
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Project Name</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. E-commerce Platform" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description (Optional)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Brief description of the project..."
                      className="resize-none"
                      rows={3}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="color"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Project Color</FormLabel>
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

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Status</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select status" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="completed">Completed</SelectItem>
                        <SelectItem value="archived">Archived</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="companyId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Company (Optional)</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select company" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="none">Personal Project</SelectItem>
                        {companies.map((company) => (
                          <SelectItem key={company.id} value={company.id}>
                            {company.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="startDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Start Date</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant="outline"
                            className="w-full justify-start text-left font-normal bg-transparent"
                          >
                            <IconCalendar className="mr-2 size-4" />
                            {field.value
                              ? format(field.value, 'MMM yyyy')
                              : 'Select date'}
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value}
                          onSelect={field.onChange}
                          disabled={(date) => date > new Date()}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="endDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>End Date</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant="outline"
                            className="w-full justify-start text-left font-normal bg-transparent"
                            disabled={status === 'active'}
                          >
                            <IconCalendar className="mr-2 size-4" />
                            {field.value
                              ? format(field.value, 'MMM yyyy')
                              : 'Select date'}
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value}
                          onSelect={field.onChange}
                          disabled={(date) => date > new Date()}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="repoRemoteUrl"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Repository URL (Optional)</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="https://github.com/username/project"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="isActive"
              render={({ field }) => (
                <FormItem className="flex items-center justify-between rounded-lg border p-3">
                  <div className="space-y-0.5">
                    <FormLabel>Active Project</FormLabel>
                    <div className="text-muted-foreground text-sm">
                      This project is currently in progress
                    </div>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
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
                {isEditing ? 'Update Project' : 'Add Project'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
