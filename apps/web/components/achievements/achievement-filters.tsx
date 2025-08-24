import { motion } from 'framer-motion';
import { Loader2Icon } from 'lucide-react';
import {
  MagnifyingGlassIcon,
  ResetIcon,
  CalendarIcon,
} from '@radix-ui/react-icons';
import { Input } from 'components/ui/input';
import { Button } from 'components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from 'components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from 'components/ui/popover';
import { Calendar } from 'components/ui/calendar';
import { cn } from 'lib/utils';
import type { Company, Project } from 'lib/db/schema';
import { format } from 'date-fns';

interface AchievementFiltersProps {
  companyId: string;
  onCompanyChange: (value: string) => void;
  projectId: string;
  onProjectChange: (value: string) => void;
  searchQuery: string;
  onSearchChange: (value: string) => void;
  startDate?: Date;
  onStartDateChange: (date?: Date) => void;
  endDate?: Date;
  onEndDateChange: (date?: Date) => void;
  companies: Company[];
  projects: Project[];
  onReset: () => void;
  loading?: {
    company?: boolean;
    project?: boolean;
    search?: boolean;
  };
}

export function AchievementFilters({
  companyId,
  onCompanyChange,
  projectId,
  onProjectChange,
  searchQuery,
  onSearchChange,
  startDate,
  onStartDateChange,
  endDate,
  onEndDateChange,
  companies,
  projects,
  onReset,
  loading = {
    company: false,
    project: false,
    search: false,
  },
}: AchievementFiltersProps) {
  const hasFilters =
    companyId !== 'all' ||
    projectId !== 'all' ||
    searchQuery.length > 0 ||
    startDate ||
    endDate;

  const isLoading = loading.company || loading.project || loading.search;

  return (
    <div className="hidden sm:flex items-center gap-4">
      <div className="relative">
        <MagnifyingGlassIcon
          className={cn(
            'absolute left-2.5 top-2.5 size-4 text-muted-foreground',
            loading.search && 'opacity-70'
          )}
        />
        <Input
          type="search"
          placeholder="Search achievements..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          disabled={loading.search}
          className={cn(
            'pl-8 transition-shadow duration-200',
            'w-[200px]',
            'focus-visible:ring-2 focus-visible:ring-primary',
            loading.search && 'opacity-70'
          )}
        />
        {loading.search && (
          <div className="absolute right-2.5 top-2.5">
            <Loader2Icon className="size-4 animate-spin text-muted-foreground" />
          </div>
        )}
      </div>

      <Select
        value={companyId}
        onValueChange={onCompanyChange}
        disabled={loading.company}
      >
        <SelectTrigger
          className={cn('w-[180px]', loading.company && 'opacity-70')}
        >
          <SelectValue placeholder="Filter by company" />
          {loading.company && (
            <Loader2Icon className="ml-2 size-4 animate-spin" />
          )}
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Companies</SelectItem>
          {companies.map((company) => (
            <SelectItem key={company.id} value={company.id}>
              {company.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={projectId}
        onValueChange={onProjectChange}
        disabled={loading.project}
      >
        <SelectTrigger
          className={cn('w-[180px]', loading.project && 'opacity-70')}
        >
          <SelectValue placeholder="Filter by project" />
          {loading.project && (
            <Loader2Icon className="ml-2 size-4 animate-spin" />
          )}
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Projects</SelectItem>
          {projects.map((project) => (
            <SelectItem key={project.id} value={project.id}>
              {project.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <div className="flex items-center gap-2">
        <Popover modal={true}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className={cn(
                'w-[130px] justify-start text-left font-normal',
                !startDate && 'text-muted-foreground'
              )}
            >
              <CalendarIcon className="mr-2 size-4" />
              {startDate ? format(startDate, 'MMM yyyy') : 'Start date'}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={startDate}
              onSelect={onStartDateChange}
              initialFocus
            />
          </PopoverContent>
        </Popover>

        <Popover modal={true}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className={cn(
                'w-[130px] justify-start text-left font-normal',
                !endDate && 'text-muted-foreground'
              )}
            >
              <CalendarIcon className="mr-2 size-4" />
              {endDate ? format(endDate, 'MMM yyyy') : 'End date'}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={endDate}
              onSelect={onEndDateChange}
              initialFocus
            />
          </PopoverContent>
        </Popover>
      </div>

      {hasFilters && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
        >
          <Button
            variant="ghost"
            size="sm"
            onClick={onReset}
            disabled={isLoading}
            className={cn('h-8 px-2 lg:px-3', isLoading && 'opacity-70')}
          >
            {isLoading ? (
              <Loader2Icon className="mr-2 size-4 animate-spin" />
            ) : (
              <ResetIcon className="mr-2 size-4" />
            )}
            Reset
          </Button>
        </motion.div>
      )}
    </div>
  );
}
