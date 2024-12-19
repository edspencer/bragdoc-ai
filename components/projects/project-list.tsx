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
import { ProjectStatus } from "@/lib/db/types";
import { ProjectActions } from "./project-actions";
import { ProjectFilters } from "./project-filters";
import { useProjectFilters } from "@/hooks/use-project-filters";

interface Company {
  id: string;
  name: string;
}

interface Project {
  id: string;
  name: string;
  description: string | null;
  status: ProjectStatus;
  startDate: Date;
  endDate: Date | null;
  company?: Company;
}

interface ProjectListProps {
  projects: Project[];
  companies: Company[];
  onCreateProject: (data: ProjectFormData) => Promise<void>;
  onUpdateProject: (id: string, data: ProjectFormData) => Promise<void>;
  onDeleteProject: (id: string) => Promise<void>;
  isLoading?: boolean;
}

const statusColors: Record<ProjectStatus, string> = {
  active: "bg-green-500/10 text-green-500 dark:bg-green-500/20",
  completed: "bg-blue-500/10 text-blue-500 dark:bg-blue-500/20",
  archived: "bg-gray-500/10 text-gray-500 dark:bg-gray-500/20",
};

export function ProjectList({
  projects,
  companies,
  onCreateProject,
  onUpdateProject,
  onDeleteProject,
  isLoading = false,
}: ProjectListProps) {
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editProject, setEditProject] = useState<Project | null>(null);
  const {
    filters,
    setStatus,
    setCompanyId,
    setSearch,
    resetFilters,
    applyFilters,
  } = useProjectFilters();

  if (isLoading) {
    return <ProjectListSkeleton />;
  }

  const filteredProjects = applyFilters(projects);
  const sortedProjects = [...filteredProjects].sort(
    (a, b) => b.startDate.getTime() - a.startDate.getTime()
  );

  const handleEdit = (project: Project) => {
    setEditProject(project);
  };

  const handleEditSubmit = async (data: ProjectFormData) => {
    if (editProject) {
      await onUpdateProject(editProject.id, data);
      setEditProject(null);
    }
  };

  const handleCreate = async (data: ProjectFormData) => {
    await onCreateProject(data);
    setCreateDialogOpen(false);
  };

  if (projects.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col items-center justify-center p-8 text-center"
      >
        <h3 className="mt-2 text-sm font-semibold text-gray-900 dark:text-gray-100">
          No projects
        </h3>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Get started by adding a project to track your achievements.
        </p>
        <div className="mt-6">
          <Button onClick={() => setCreateDialogOpen(true)}>
            <PlusIcon className="mr-2 h-4 w-4" />
            Add Project
          </Button>
        </div>

        <ProjectDialog
          open={createDialogOpen}
          onOpenChange={setCreateDialogOpen}
          onSubmit={handleCreate}
          mode="create"
          isLoading={isLoading}
          companies={companies}
        />
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      <div className="mb-6">
        <ProjectFilters
          status={filters.status}
          onStatusChange={setStatus}
          companyId={filters.companyId}
          onCompanyChange={setCompanyId}
          searchQuery={filters.search}
          onSearchChange={setSearch}
          companies={companies}
          onReset={resetFilters}
        />
      </div>

      <div className="mb-4 flex justify-end">
        <Button onClick={() => setCreateDialogOpen(true)}>
          <PlusIcon className="mr-2 h-4 w-4" />
          Add Project
        </Button>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Project</TableHead>
              <TableHead>Company</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Start Date</TableHead>
              <TableHead>End Date</TableHead>
              <TableHead className="w-[100px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedProjects.map((project, index) => (
              <motion.tr
                key={project.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className="group"
              >
                <TableCell>
                  <div>
                    <div className="font-medium transition-colors group-hover:text-primary">
                      {project.name}
                    </div>
                    {project.description && (
                      <div className="text-sm text-muted-foreground">
                        {project.description}
                      </div>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  {project.company ? project.company.name : "-"}
                </TableCell>
                <TableCell>
                  <Badge
                    variant="secondary"
                    className={statusColors[project.status]}
                  >
                    {project.status}
                  </Badge>
                </TableCell>
                <TableCell>{format(project.startDate, "MMM yyyy")}</TableCell>
                <TableCell>
                  {project.endDate
                    ? format(project.endDate, "MMM yyyy")
                    : "Present"}
                </TableCell>
                <TableCell>
                  <ProjectActions
                    project={project}
                    onEdit={handleEdit}
                    onDelete={onDeleteProject}
                  />
                </TableCell>
              </motion.tr>
            ))}
          </TableBody>
        </Table>
      </div>

      <ProjectDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        onSubmit={handleCreate}
        mode="create"
        isLoading={isLoading}
        companies={companies}
      />

      {editProject && (
        <ProjectDialog
          open={true}
          onOpenChange={() => setEditProject(null)}
          initialData={{
            name: editProject.name,
            description: editProject.description || "",
            companyId: editProject.company?.id,
            status: editProject.status,
            startDate: editProject.startDate,
            endDate: editProject.endDate,
          }}
          onSubmit={handleEditSubmit}
          mode="edit"
          isLoading={isLoading}
          companies={companies}
        />
      )}
    </motion.div>
  );
}
