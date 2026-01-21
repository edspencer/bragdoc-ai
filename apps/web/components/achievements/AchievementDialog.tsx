import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from 'components/ui/button';
import { DatePicker } from 'components/ui/date-picker';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from 'components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from 'components/ui/form';
import { Input } from 'components/ui/input';
import { Textarea } from 'components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from 'components/ui/select';
import { ImpactRating } from 'components/ui/impact-rating';
import { z } from 'zod/v3';
import type { AchievementUI } from 'lib/types/achievement';
import { useCompanies } from 'hooks/use-companies';
import { useProjects } from 'hooks/useProjects';
import { useAchievements } from 'hooks/use-achievements';
import { useConfetti } from 'hooks/useConfetti';
import { toast } from 'sonner';

const achievementRequestSchema = z.object({
  title: z.string().min(1).max(256),
  summary: z.string().nullable().optional(),
  details: z.string().nullable().optional(),
  eventStart: z.date().nullable().optional(),
  eventEnd: z.date().nullable().optional(),
  eventDuration: z.enum([
    'day',
    'week',
    'month',
    'quarter',
    'half year',
    'year',
  ]),
  companyId: z.string().uuid().nullable().optional(),
  projectId: z.string().uuid().nullable().optional(),
  impact: z.number().min(1).max(10).default(2),
  impactSource: z.enum(['user', 'llm']).default('user'),
  impactUpdatedAt: z.date().default(() => new Date()),
});

type FormValues = z.infer<typeof achievementRequestSchema>;

type DialogMode = 'create' | 'edit' | 'view';

interface AchievementDialogProps {
  mode: DialogMode;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  achievement?: AchievementUI;
  onSubmit?: (data: FormValues) => void;
}

export function AchievementDialog({
  mode,
  open,
  onOpenChange,
  achievement,
  onSubmit,
}: AchievementDialogProps) {
  const { companies } = useCompanies();
  const { projects } = useProjects();
  const { createAchievement, updateAchievement } = useAchievements();
  const { fire: fireConfetti } = useConfetti();
  const isViewMode = mode === 'view';

  const form = useForm<FormValues>({
    resolver: zodResolver(achievementRequestSchema),
    defaultValues: {
      title: '',
      summary: null,
      details: null,
      eventStart: null,
      eventEnd: null,
      eventDuration: 'day',
      companyId: null,
      projectId: null,
      impact: 2,
      impactSource: 'user',
      impactUpdatedAt: new Date(),
    },
  });

  useEffect(() => {
    if (achievement && open) {
      form.reset({
        title: achievement.title,
        summary: achievement.summary,
        details: achievement.details,
        eventStart: achievement.eventStart
          ? new Date(achievement.eventStart)
          : null,
        eventEnd: achievement.eventEnd ? new Date(achievement.eventEnd) : null,
        eventDuration: achievement.eventDuration,
        companyId: achievement.companyId,
        projectId: achievement.projectId,
        impact: achievement.impact ?? 2,
        impactSource: achievement.impactSource ?? 'user',
        impactUpdatedAt: achievement.impactUpdatedAt
          ? new Date(achievement.impactUpdatedAt)
          : new Date(),
      });
    }
  }, [achievement, open, form]);

  const handleSubmit = async (data: FormValues) => {
    try {
      const achievementData = {
        ...data,
        source: 'manual' as const,
        impactSource: 'user' as const,
        impactUpdatedAt: new Date(),
        isArchived: false,
        companyId: data.companyId || null,
        projectId: data.projectId || null,
        summary: data.summary || null,
        details: data.details || null,
        eventStart: data.eventStart || null,
        eventEnd: data.eventEnd || null,
        standupDocumentId: null,
      };

      if (mode === 'edit' && achievement) {
        await updateAchievement(achievement.id, {
          ...achievementData,
          userMessageId: achievement.userMessageId,
        });
        toast.success('Achievement updated successfully');
      } else {
        await createAchievement({
          ...achievementData,
          userMessageId: null,
        });
        toast.success('Achievement created successfully');
        fireConfetti();
      }
      onOpenChange(false);
      form.reset();
    } catch (error) {
      console.error('Error saving achievement:', error);
      toast.error(
        mode === 'edit'
          ? 'Failed to update achievement'
          : 'Failed to create achievement',
      );
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>
            {mode === 'create'
              ? 'New Achievement'
              : mode === 'edit'
                ? 'Edit Achievement'
                : 'View Achievement'}
          </DialogTitle>
          <DialogDescription>
            {mode === 'create'
              ? 'Add a new achievement to your brag document.'
              : mode === 'edit'
                ? 'Edit the details of your achievement.'
                : 'View the details of your achievement.'}
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
                  <FormLabel>Title</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="What did you achieve?"
                      {...field}
                      disabled={isViewMode}
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
              name="impact"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Impact Level</FormLabel>
                  <FormControl>
                    <ImpactRating
                      value={field.value}
                      onChange={field.onChange}
                      readOnly={isViewMode}
                      source="user"
                      className="mt-2"
                      showLabel
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="summary"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Summary</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Brief summary of your achievement"
                      {...field}
                      value={field.value ?? ''}
                      disabled={isViewMode}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="details"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Details</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Describe your achievement in detail"
                      className="resize-none"
                      {...field}
                      value={field.value ?? ''}
                      disabled={isViewMode}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="eventStart"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Start Date</FormLabel>
                    <FormControl>
                      <DatePicker
                        value={field.value}
                        onChange={field.onChange}
                        maxDate={new Date()}
                        disabled={isViewMode}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="eventEnd"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>End Date</FormLabel>
                    <FormControl>
                      <DatePicker
                        value={field.value}
                        onChange={field.onChange}
                        maxDate={new Date()}
                        minDate={
                          form.getValues('eventStart') || new Date('1900-01-01')
                        }
                        disabled={isViewMode}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="eventDuration"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Duration</FormLabel>
                  <Select
                    disabled={isViewMode}
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select duration" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="day">Day</SelectItem>
                      <SelectItem value="week">Week</SelectItem>
                      <SelectItem value="month">Month</SelectItem>
                      <SelectItem value="quarter">Quarter</SelectItem>
                      <SelectItem value="half year">Half Year</SelectItem>
                      <SelectItem value="year">Year</SelectItem>
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
                  <FormLabel>Company</FormLabel>
                  <Select
                    disabled={isViewMode}
                    onValueChange={field.onChange}
                    defaultValue={field.value ?? undefined}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select company" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {companies?.map((company) => (
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

            <FormField
              control={form.control}
              name="projectId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Project</FormLabel>
                  <Select
                    disabled={isViewMode}
                    onValueChange={field.onChange}
                    defaultValue={field.value ?? undefined}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select project" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
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

            {!isViewMode && (
              <DialogFooter>
                <Button type="submit">
                  {mode === 'create' ? 'Create' : 'Save changes'}
                </Button>
              </DialogFooter>
            )}
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
