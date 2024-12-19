'use client';

import { useEffect, useState } from 'react';
import { ProjectList } from '@/components/projects/project-list';
import { ProjectListSkeleton } from '@/components/projects/project-list-skeleton';
import type { ProjectWithCompany } from '@/lib/db/projects/queries';
import type { ProjectFormData } from '@/components/projects/project-form';

export default function ProjectPage() {
  const [projects, setProjects] = useState<ProjectWithCompany[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchProjects = async () => {
      try {
        const response = await fetch('/api/projects');
        if (!response.ok) {
          throw new Error('Failed to fetch projects');
        }
        const data = await response.json();
        setProjects(data);
      } catch (error) {
        console.error('Error fetching projects:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchProjects();
  }, []);

  const handleCreateProject = async (data: ProjectFormData): Promise<boolean> => {
    try {
      const response = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error('Failed to create project');
      const newProject = await response.json();
      setProjects(prev => [...prev, newProject]);
      return true;
    } catch (error) {
      console.error('Error creating project:', error);
      return false;
    }
  };

  const handleUpdateProject = async (id: string, data: ProjectFormData): Promise<boolean> => {
    try {
      const response = await fetch(`/api/projects/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error('Failed to update project');
      const updatedProject = await response.json();
      setProjects(prev => prev.map(p => p.id === id ? updatedProject : p));
      return true;
    } catch (error) {
      console.error('Error updating project:', error);
      return false;
    }
  };

  const handleDeleteProject = async (id: string): Promise<boolean> => {
    try {
      const response = await fetch(`/api/projects/${id}`, { method: 'DELETE' });
      if (!response.ok) throw new Error('Failed to delete project');
      setProjects(prev => prev.filter(p => p.id !== id));
      return true;
    } catch (error) {
      console.error('Error deleting project:', error);
      return false;
    }
  };

  if (isLoading) {
    return <ProjectListSkeleton />;
  }

  return (
    <div className="p-6">
      <ProjectList
        projects={projects}
        onCreateProject={handleCreateProject}
        onUpdateProject={handleUpdateProject}
        onDeleteProject={handleDeleteProject}
        isLoading={isLoading}
      />
    </div>
  );
}
