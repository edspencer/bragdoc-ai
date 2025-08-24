'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';

import { Button } from 'components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from 'components/ui/form';
import { Input } from 'components/ui/input';
import { DatePicker } from 'components/ui/date-picker';

const formSchema = z.object({
  name: z.string().min(1, 'Company name is required').max(256),
  domain: z.string().max(256).optional(),
  role: z.string().min(1, 'Role is required').max(256),
  startDate: z.date({ required_error: 'Start date is required' }),
  endDate: z.date().nullable().optional(),
});

export type CompanyFormData = z.infer<typeof formSchema>;

interface CompanyFormProps {
  initialData?: Partial<CompanyFormData>;
  onSubmit: (data: CompanyFormData) => void;
  isLoading?: boolean;
}

export function CompanyForm({
  initialData,
  onSubmit,
  isLoading = false,
}: CompanyFormProps) {
  const form = useForm<CompanyFormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: initialData?.name || '',
      domain: initialData?.domain || '',
      role: initialData?.role || '',
      startDate: initialData?.startDate || undefined,
      endDate: initialData?.endDate ?? null,
    },
  });

  const handleSubmit = (data: CompanyFormData) => {
    // Ensure endDate is explicitly included, even if null
    onSubmit({
      ...data,
      endDate: data.endDate ?? null,
    });
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Company Name</FormLabel>
              <FormControl>
                <Input placeholder="Acme Corp" {...field} />
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
                <Input placeholder="acme.com" {...field} />
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
                <Input placeholder="Software Engineer" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="startDate"
          render={({ field }) => (
            <FormItem className="flex flex-col">
              <FormLabel>Start Date</FormLabel>
              <FormControl>
                <DatePicker
                  value={field.value}
                  onChange={field.onChange}
                  maxDate={new Date()}
                  required
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="endDate"
          render={({ field }) => (
            <FormItem className="flex flex-col">
              <FormLabel>End Date (Optional)</FormLabel>
              <FormControl>
                <DatePicker
                  value={field.value ?? undefined}
                  onChange={field.onChange}
                  maxDate={new Date()}
                  minDate={
                    form.getValues('startDate') || new Date('1900-01-01')
                  }
                  required
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button type="submit" disabled={isLoading}>
          {isLoading ? 'Saving...' : 'Save Company'}
        </Button>
      </form>
    </Form>
  );
}
