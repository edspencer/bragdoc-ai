"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { PlusIcon } from "@radix-ui/react-icons";
import { format } from "date-fns";
import { ProjectDialog } from "./project-dialog";
import { ProjectListSkeleton } from "./project-list-skeleton";
import { useState } from "react";
import { ProjectFormData } from "./project-form";
import { motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { ProjectStatus } from "@/lib/db/schema";
import { ProjectActions } from "./project-actions";
import type { ProjectWithCompany } from "@/lib/db/projects/queries";

interface ProjectListProps {
  projects: ProjectWithCompany[];
  onCreateProject: (data: ProjectFormData) => Promise<boolean>;
  onUpdateProject: (id: string, data: ProjectFormData) => Promise<boolean>;
  onDeleteProject: (id: string) => Promise<boolean>;
  isLoading?: boolean;
}

const statusColors: Record<ProjectStatus, string> = {
  active: "bg-green-500/10 text-green-500 dark:bg-green-500/20",
  completed: "bg-blue-500/10 text-blue-500 dark:bg-blue-500/20",
  archived: "bg-gray-500/10 text-gray-500 dark:bg-gray-500/20",
};

export function ProjectList({
  projects,
  onCreateProject,
  onUpdateProject,
  onDeleteProject,
  isLoading = false,
}: ProjectListProps) {
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editProject, setEditProject] = useState<ProjectWithCompany | null>(null);

  if (isLoading) {
    return <ProjectListSkeleton />;
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button
          onClick={() => setCreateDialogOpen(true)}
          className="ml-auto"
          size="sm"
        >
          <PlusIcon className="mr-2 h-4 w-4" />
          Add Project
        </Button>
      </div>

      {projects.length === 0 ? (
        <div className="flex min-h-[400px] flex-col items-center justify-center rounded-md border border-dashed p-8 text-center animate-in fade-in-50">
          <div className="mx-auto flex max-w-[420px] flex-col items-center justify-center text-center">
            <h2 className="mt-6 text-xl font-semibold">No projects added</h2>
            <p className="mb-8 mt-2 text-center text-sm font-normal leading-6 text-muted-foreground">
              You haven&apos;t added any projects yet. Add your first project to start
              tracking achievements.
            </p>
            <Button
              onClick={() => setCreateDialogOpen(true)}
              className="relative"
              size="sm"
            >
              <PlusIcon className="mr-2 h-4 w-4" />
              Add Project
            </Button>
          </div>
        </div>
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Project</TableHead>
                <TableHead>Company</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Start Date</TableHead>
                <TableHead>End Date</TableHead>
                <TableHead className="w-[100px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {projects.map((project) => (
                <motion.tr
                  key={project.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="group hover:bg-muted/50"
                >
                  <TableCell className="font-medium">{project.name}</TableCell>
                  <TableCell>{project.company?.name || "—"}</TableCell>
                  <TableCell>
                    <Badge
                      variant="secondary"
                      className={statusColors[project.status]}
                    >
                      {project.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {format(new Date(project.startDate), "MMM d, yyyy")}
                  </TableCell>
                  <TableCell>
                    {project.endDate
                      ? format(new Date(project.endDate), "MMM d, yyyy")
                      : "—"}
                  </TableCell>
                  <TableCell>
                    <ProjectActions
                      project={project}
                      onEdit={() => setEditProject(project)}
                      onDelete={() => onDeleteProject(project.id)}
                    />
                  </TableCell>
                </motion.tr>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <ProjectDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        onSubmit={async (data) => {
          const success = await onCreateProject(data);
          if (success) setCreateDialogOpen(false);
        }}
        mode="create"
      />

      {editProject && (
        <ProjectDialog
          open={true}
          onOpenChange={() => setEditProject(null)}
          initialData={{
            ...editProject,
            description: editProject.description ?? undefined,
          }}
          onSubmit={async (data) => {
            const success = await onUpdateProject(editProject.id, data);
            if (success) setEditProject(null);
          }}
          mode="edit"
        />
      )}
    </div>
  );
}
