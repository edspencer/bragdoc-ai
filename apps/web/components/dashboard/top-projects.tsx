'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { format } from 'date-fns';
import { FolderKanban, Trophy, Plus, Building2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from 'components/ui/card';
import { Badge } from 'components/ui/badge';
import { Button } from 'components/ui/button';
import { ProjectDialog } from '@/components/project-dialog';
import { useTopProjects } from '@/hooks/use-top-projects';
import { useCompanies } from '@/hooks/use-companies';
import { useCreateProject } from '@/hooks/useProjects';

export function TopProjects() {
  const { projects, isLoading } = useTopProjects(5);
  const { companies } = useCompanies();
  const createProject = useCreateProject();
  const [createDialogOpen, setCreateDialogOpen] = useState(false);

  const handleCreateProject = async (data: any) => {
    try {
      await createProject(data);
      setCreateDialogOpen(false);
      return true;
    } catch (error) {
      console.error('Error creating project:', error);
      return false;
    }
  };

  const statusColors = {
    active: 'bg-green-500/10 text-green-500 dark:bg-green-500/20',
    completed: 'bg-blue-500/10 text-blue-500 dark:bg-blue-500/20',
    archived: 'bg-gray-500/10 text-gray-500 dark:bg-gray-500/20',
  } as const;

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FolderKanban className="size-5" />
            Top Projects
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="animate-pulse">
                <div className="h-4 bg-muted rounded w-3/4 mb-2" />
                <div className="h-3 bg-muted rounded w-1/2" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FolderKanban className="size-5" />
            Top Projects
          </CardTitle>
        </CardHeader>
        <CardContent>
          {projects.length === 0 ? (
            <div className="text-center py-6">
              <p className="text-sm text-muted-foreground mb-4">
                No projects yet. Create your first project to start tracking
                achievements.
              </p>
              <Button
                onClick={() => setCreateDialogOpen(true)}
                className="gap-2"
              >
                <Plus className="size-4" />
                Create Project
              </Button>
            </div>
          ) : (
            <>
              <div className="space-y-4">
                {projects
                  .slice(0, projects.length < 5 ? projects.length : 5)
                  .map((project, index) => (
                    <div
                      key={project.id}
                      className="space-y-2 border-b border-border pb-4 last:border-b-0"
                    >
                      <div className="flex items-start justify-between">
                        <div className="space-y-1 flex-1 items-stretch">
                          <div className="flex justify-between">
                            <div className="gap-2 flex items-center">
                              <span className="text-xs text-muted-foreground font-mono">
                                #{index + 1}
                              </span>
                              <Link
                                href={`/projects/${project.id}`}
                                className="text-sm font-medium hover:underline"
                              >
                                {project.name}
                              </Link>
                            </div>
                            <Badge
                              variant="outline"
                              className={`${statusColors[project.status as keyof typeof statusColors]} text-xs`}
                            >
                              {project.status}
                            </Badge>
                          </div>
                          {project.description && (
                            <p className="text-sm text-muted-foreground line-clamp-2">
                              {project.description}
                            </p>
                          )}
                          <div className="flex items-center gap-4 text-xs text-muted-foreground">
                            <div className="flex items-center gap-1">
                              <Trophy
                                className="size-3"
                                style={{ color: project.color }}
                              />
                              {project.totalImpact || 0} impact (
                              {project.achievementCount} achievements)
                            </div>
                            {project.company && (
                              <div className="hidden lg:flex items-center gap-1">
                                <Building2 className="size-3" />
                                {project.company.name}
                              </div>
                            )}
                            <div>
                              Started{' '}
                              {format(new Date(project.startDate), 'MMM yyyy')}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
              {projects.length < 5 && (
                <div className="mt-4 pt-4 border-t">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCreateDialogOpen(true)}
                    className="w-full gap-2"
                  >
                    <Plus className="size-4" />
                    Create Project
                  </Button>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      <ProjectDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        companies={companies || []}
        onSubmit={handleCreateProject}
        existingProjectCount={projects.length}
      />
    </>
  );
}
