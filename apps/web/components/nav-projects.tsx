'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { IconFolder, IconDots } from '@tabler/icons-react';

import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@/components/ui/sidebar';
import { useTopProjects } from '@/hooks/use-top-projects';
import { cn } from '@/lib/utils';

export function NavProjects() {
  const { projects, isLoading } = useTopProjects(5);
  const pathname = usePathname();

  return (
    <SidebarGroup>
      <SidebarGroupLabel>Projects</SidebarGroupLabel>
      <SidebarGroupContent>
        <SidebarMenu>
          {isLoading
            ? // Show loading skeleton
              [...Array(3)].map((_, i) => (
                <SidebarMenuItem key={i}>
                  <SidebarMenuButton disabled>
                    <div className="size-4 bg-muted rounded animate-pulse" />
                    <div className="h-3 bg-muted rounded w-20 animate-pulse" />
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))
            : projects.map((project) => {
                const isActive = pathname === `/projects/${project.id}`;
                return (
                  <SidebarMenuItem key={project.id}>
                    <SidebarMenuButton
                      tooltip={project.name}
                      asChild
                      className={cn(
                        isActive &&
                          'bg-primary text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground active:bg-primary/90 active:text-primary-foreground font-medium',
                      )}
                    >
                      <Link href={`/projects/${project.id}`}>
                        <IconFolder
                          className="size-4"
                          style={{ color: project.color || '#6b7280' }}
                        />
                        <span className="truncate">{project.name}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}

          {/* More Projects link */}
          <SidebarMenuItem>
            <SidebarMenuButton
              tooltip="More Projects"
              asChild
              className={cn(
                pathname === '/projects' &&
                  'bg-primary text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground active:bg-primary/90 active:text-primary-foreground font-medium',
              )}
            >
              <Link href="/projects">
                <IconDots className="size-4" />
                <span>More Projects</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );
}
