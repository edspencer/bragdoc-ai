'use client';

import { useState, useEffect } from 'react';
import { Button } from 'components/ui/button';
import { Checkbox } from 'components/ui/checkbox';
import { Popover, PopoverContent, PopoverTrigger } from 'components/ui/popover';
import { ChevronDown, Building2, FolderKanban } from 'lucide-react';
import { ScrollArea } from 'components/ui/scroll-area';
import type { Company, Project } from '@bragdoc/database';

interface CompanyProjectSelectorProps {
  selectedCompanyId: string | null;
  selectedProjectIds: string[];
  onCompanyChange: (companyId: string | null) => void;
  onProjectsChange: (projectIds: string[]) => void;
}

export function CompanyProjectSelector({
  selectedCompanyId,
  selectedProjectIds,
  onCompanyChange,
  onProjectsChange,
}: CompanyProjectSelectorProps) {
  const [open, setOpen] = useState(false);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const [companiesRes, projectsRes] = await Promise.all([
          fetch('/api/companies'),
          fetch('/api/projects'),
        ]);

        if (companiesRes.ok) {
          const data = await companiesRes.json();
          // API returns array directly, not nested in 'companies' property
          setCompanies(Array.isArray(data) ? data : []);
        }

        if (projectsRes.ok) {
          const data = await projectsRes.json();
          // API returns array directly, not nested in 'projects' property
          setProjects(Array.isArray(data) ? data : []);
        }
      } catch (error) {
        console.error('Error fetching companies/projects:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, []);

  const getDisplayText = () => {
    if (selectedCompanyId) {
      const company = companies.find((c) => c.id === selectedCompanyId);
      return company?.name ? `All ${company.name} Projects` : 'All Projects';
    }
    if (selectedProjectIds.length > 0) {
      if (selectedProjectIds.length === 1) {
        const project = projects.find((p) => p.id === selectedProjectIds[0]);
        return project?.name || 'All Projects';
      }
      // Multiple projects selected
      const selectedProjects = projects.filter((p) =>
        selectedProjectIds.includes(p.id),
      );
      if (selectedProjects.length <= 3) {
        // Show all names if 3 or fewer
        return selectedProjects.map((p) => p.name).join(', ');
      }
      // Show first 2 names and count of remaining
      const firstTwo = selectedProjects
        .slice(0, 2)
        .map((p) => p.name)
        .join(', ');
      const remaining = selectedProjects.length - 2;
      return `${firstTwo} and ${remaining} more Projects`;
    }
    return 'All Projects';
  };

  const handleCompanyToggle = (companyId: string) => {
    if (selectedCompanyId === companyId) {
      onCompanyChange(null);
    } else {
      onCompanyChange(companyId);
    }
  };

  const handleProjectToggle = (projectId: string) => {
    const newProjectIds = selectedProjectIds.includes(projectId)
      ? selectedProjectIds.filter((id) => id !== projectId)
      : [...selectedProjectIds, projectId];
    onProjectsChange(newProjectIds);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className="w-full justify-between bg-transparent"
        >
          {getDisplayText()}
          <ChevronDown className="ml-2 size-4 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[400px] p-0" align="start">
        <ScrollArea className="h-[300px]">
          <div className="p-4 space-y-4">
            {loading ? (
              <div className="text-sm text-muted-foreground">Loading...</div>
            ) : (
              <>
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                    <Building2 className="size-4" />
                    <span>Companies</span>
                  </div>
                  {companies.length === 0 ? (
                    <div className="text-sm text-muted-foreground">
                      No companies found
                    </div>
                  ) : (
                    companies.map((company) => (
                      <div key={company.id} className="flex items-center gap-2">
                        <Checkbox
                          checked={selectedCompanyId === company.id}
                          onCheckedChange={() =>
                            handleCompanyToggle(company.id)
                          }
                        />
                        <label
                          className="text-sm cursor-pointer flex-1"
                          onClick={() => handleCompanyToggle(company.id)}
                        >
                          {company.name}
                        </label>
                      </div>
                    ))
                  )}
                </div>

                <div className="border-t pt-4 space-y-2">
                  <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                    <FolderKanban className="size-4" />
                    <span>Projects</span>
                  </div>
                  {projects.length === 0 ? (
                    <div className="text-sm text-muted-foreground">
                      No projects found
                    </div>
                  ) : (
                    projects.map((project) => (
                      <div key={project.id} className="flex items-center gap-2">
                        <Checkbox
                          checked={selectedProjectIds.includes(project.id)}
                          onCheckedChange={() =>
                            handleProjectToggle(project.id)
                          }
                        />
                        <label
                          className="text-sm cursor-pointer flex-1"
                          onClick={() => handleProjectToggle(project.id)}
                        >
                          {project.name}
                        </label>
                      </div>
                    ))
                  )}
                </div>
              </>
            )}
          </div>
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
