'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { IconFolder } from '@tabler/icons-react';

import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@/components/ui/sidebar';
import { useTopProjects } from '@/hooks/use-top-projects';

export function NavProjects() {
  const { projects, isLoading } = useTopProjects(5);
  const pathname = usePathname();

  return (
    <SidebarGroup>
      <SidebarGroupLabel>Projects</SidebarGroupLabel>
      <SidebarGroupContent>
        <SidebarMenu>
          {/* All Projects link */}
          <SidebarMenuItem>
            <SidebarMenuButton
              tooltip="All Projects"
              asChild
              isActive={pathname === '/projects'}
            >
              <Link href="/projects">
                <IconFolder className="w-4 h-4" />
                <span>All Projects</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>

          {isLoading ? (
            // Show loading skeleton
            [...Array(3)].map((_, i) => (
              <SidebarMenuItem key={i}>
                <SidebarMenuButton disabled>
                  <div className="w-4 h-4 bg-muted rounded animate-pulse" />
                  <div className="h-3 bg-muted rounded w-20 animate-pulse" />
                </SidebarMenuButton>
              </SidebarMenuItem>
            ))
          ) : (
            projects.map((project) => {
              const isActive = pathname === `/projects/${project.id}`;
              return (
                <SidebarMenuItem key={project.id}>
                  <SidebarMenuButton
                    tooltip={project.name}
                    asChild
                    isActive={isActive}
                    className="pl-6" // Indent to show it's under Projects
                  >
                    <Link href={`/projects/${project.id}`}>
                      <IconFolder
                        className="w-4 h-4"
                        style={{ color: project.color || '#6b7280' }}
                      />
                      <span className="truncate">{project.name}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              );
            })
          )}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );
}