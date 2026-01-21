'use client';

import * as React from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { IconBuilding, IconCalendar } from '@tabler/icons-react';
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
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Switch } from '@/components/ui/switch';

import type { Company } from '@/database/schema';

const companySchema = z.object({
  name: z.string().min(1, 'Company name is required'),
  domain: z.string().optional(),
  role: z.string().min(1, 'Role is required'),
  startDate: z.date({
    required_error: 'Start date is required',
  }),
  endDate: z.date().optional(),
  isCurrent: z.boolean().default(false),
});

type CompanyFormData = z.infer<typeof companySchema>;

interface CompanyDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  company?: Company | null;
  onSubmit: (data: Omit<Company, 'id'>) => void;
}

export function CompanyDialog({
  open,
  onOpenChange,
  company,
  onSubmit,
}: CompanyDialogProps) {
  const isEditing = !!company;

  const form = useForm<CompanyFormData>({
    resolver: zodResolver(companySchema),
    defaultValues: {
      name: '',
      domain: '',
      role: '',
      startDate: new Date(),
      endDate: undefined,
      isCurrent: false,
    },
  });

  const isCurrent = form.watch('isCurrent');

  // Reset form when dialog opens/closes or company changes
  React.useEffect(() => {
    if (open) {
      if (company) {
        form.reset({
          name: company.name,
          domain: company.domain || '',
          role: company.role,
          startDate: company.startDate,
          endDate: company.endDate || undefined,
          isCurrent: !company.endDate,
        });
      } else {
        form.reset({
          name: '',
          domain: '',
          role: '',
          startDate: new Date(),
          endDate: undefined,
          isCurrent: false,
        });
      }
    }
  }, [open, company, form]);

  // Clear end date when marking as current
  React.useEffect(() => {
    if (isCurrent) {
      form.setValue('endDate', undefined);
    }
  }, [isCurrent, form]);

  const handleSubmit = (data: CompanyFormData) => {
    const { isCurrent, ...companyData } = data;
    onSubmit({
      ...companyData,
      domain: companyData.domain || null,
      endDate: isCurrent ? null : companyData.endDate || null,
      userId: '1',
    });
    onOpenChange(false);
    form.reset();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <IconBuilding className="size-5" />
            {isEditing ? 'Edit Company' : 'Add Company'}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? 'Update the company information below.'
              : 'Add a new company to your work history.'}
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
                  <FormLabel>Company Name</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="e.g. Acme Corp"
                      {...field}
                      autoComplete="off"
                      data-1p-ignore
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="domain"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Domain (Optional)</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. acme.com" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="role"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Role</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="e.g. Senior Software Engineer"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

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
                            disabled={isCurrent}
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
              name="isCurrent"
              render={({ field }) => (
                <FormItem className="flex items-center justify-between rounded-lg border p-3">
                  <div className="space-y-0.5">
                    <FormLabel>Current Position</FormLabel>
                    <div className="text-muted-foreground text-sm">
                      I currently work at this company
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
                {isEditing ? 'Update Company' : 'Add Company'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
