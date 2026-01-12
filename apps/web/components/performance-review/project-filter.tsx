'use client';

import { IconFilter } from '@tabler/icons-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import type { FakeProject } from '@/lib/performance-review-fake-data';

interface ProjectFilterProps {
  projects: FakeProject[];
  selectedProjectIds: string[];
  onSelectionChange: (projectIds: string[]) => void;
}

export function ProjectFilter({
  projects,
  selectedProjectIds,
  onSelectionChange,
}: ProjectFilterProps) {
  const allSelected = selectedProjectIds.length === projects.length;
  const noneSelected = selectedProjectIds.length === 0;

  const handleSelectAll = () => {
    onSelectionChange(projects.map((p) => p.id));
  };

  const handleClearAll = () => {
    onSelectionChange([]);
  };

  const handleToggleProject = (projectId: string, checked: boolean) => {
    if (checked) {
      onSelectionChange([...selectedProjectIds, projectId]);
    } else {
      onSelectionChange(selectedProjectIds.filter((id) => id !== projectId));
    }
  };

  const getButtonLabel = () => {
    if (allSelected || noneSelected) {
      return 'All Projects';
    }
    return `${selectedProjectIds.length} Project${selectedProjectIds.length === 1 ? '' : 's'} Selected`;
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" aria-label="Filter by projects">
          <IconFilter className="mr-2 size-4" />
          {getButtonLabel()}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64" align="end">
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium">Filter by Project</p>
            <div className="flex gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleSelectAll}
                disabled={allSelected}
                className="h-auto px-2 py-1 text-xs"
              >
                Select All
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClearAll}
                disabled={noneSelected}
                className="h-auto px-2 py-1 text-xs"
              >
                Clear All
              </Button>
            </div>
          </div>
          <div className="flex flex-col gap-2">
            {projects.map((project) => {
              const isSelected = selectedProjectIds.includes(project.id);
              const checkboxId = `project-filter-${project.id}`;
              return (
                <div
                  key={project.id}
                  className="flex cursor-pointer items-center gap-3 rounded-md px-2 py-1.5 hover:bg-accent"
                  onClick={() => handleToggleProject(project.id, !isSelected)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      handleToggleProject(project.id, !isSelected);
                    }
                  }}
                  role="button"
                  tabIndex={0}
                >
                  <Checkbox
                    id={checkboxId}
                    checked={isSelected}
                    onCheckedChange={(checked) =>
                      handleToggleProject(project.id, checked === true)
                    }
                    aria-label={`Select ${project.name}`}
                    onClick={(e) => e.stopPropagation()}
                  />
                  <span
                    className="size-3 shrink-0 rounded-full"
                    style={{ backgroundColor: project.color }}
                    aria-hidden="true"
                  />
                  <span className="text-sm">{project.name}</span>
                </div>
              );
            })}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
