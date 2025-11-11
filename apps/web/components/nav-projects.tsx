'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { IconFolder, IconDots } from '@tabler/icons-react';
import type { ProjectWithImpact } from '@bragdoc/database';

import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from '@/components/ui/sidebar';
import { cn } from '@/lib/utils';

interface NavProjectsProps {
  projects?: ProjectWithImpact[];
}

export function NavProjects({ projects = [] }: NavProjectsProps) {
  const pathname = usePathname();
  const { isMobile, setOpenMobile } = useSidebar();

  const handleLinkClick = () => {
    if (isMobile) {
      setOpenMobile(false);
    }
  };

  return (
    <SidebarGroup>
      <SidebarGroupLabel>Projects</SidebarGroupLabel>
      <SidebarGroupContent>
        <SidebarMenu>
          {projects.map((project) => {
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
                  <Link
                    href={`/projects/${project.id}`}
                    onClick={handleLinkClick}
                  >
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
              <Link href="/projects" onClick={handleLinkClick}>
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
