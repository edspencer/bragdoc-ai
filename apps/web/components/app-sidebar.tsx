'use client';

import type * as React from 'react';
import {
  IconTarget,
  IconChartBar,
  IconDashboard,
  IconBuilding,
  IconFileAi,
  IconFolder,
  IconHelp,
  IconBrandGithub,
  IconListDetails,
  IconReport,
  IconSearch,
  IconSettings,
  IconStar,
} from '@tabler/icons-react';

import { NavDocuments } from '@/components/nav-documents';
import { NavMain } from '@/components/nav-main';
import { NavSecondary } from '@/components/nav-secondary';
import { NavUser } from '@/components/nav-user';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@/components/ui/sidebar';

const data = {
  user: {
    name: 'John Doe',
    email: 'john@example.com',
    avatar: '/avatars/user.jpg',
  },
  navMain: [
    {
      title: 'Dashboard',
      url: '/dashboard',
      icon: IconDashboard,
    },
    {
      title: 'Achievements',
      url: '/achievements',
      icon: IconTarget,
    },
    {
      title: 'Projects',
      url: '/projects',
      icon: IconFolder,
    },
    {
      title: 'Companies',
      url: '/companies',
      icon: IconBuilding,
    },
    {
      title: 'Analytics',
      url: '/analytics',
      icon: IconChartBar,
    },
  ],
  navClouds: [
    {
      title: 'Documents',
      icon: IconFileAi,
      isActive: true,
      url: '/documents',
      items: [
        {
          title: 'Performance Reviews',
          url: '/documents/reviews',
        },
        {
          title: 'Career Summaries',
          url: '/documents/summaries',
        },
        {
          title: 'Templates',
          url: '/documents/templates',
        },
      ],
    },
    {
      title: 'GitHub Integration',
      icon: IconBrandGithub,
      url: '/github',
      items: [
        {
          title: 'Connected Repos',
          url: '/github/repos',
        },
        {
          title: 'Commit History',
          url: '/github/commits',
        },
      ],
    },
  ],
  navSecondary: [
    {
      title: 'Settings',
      url: '/settings',
      icon: IconSettings,
    },
    {
      title: 'Get Help',
      url: '/help',
      icon: IconHelp,
    },
    {
      title: 'Search',
      url: '/search',
      icon: IconSearch,
    },
  ],
  documents: [
    {
      name: 'AI Assistant',
      url: '/ai',
      icon: IconFileAi,
    },
    {
      name: 'Reports',
      url: '/reports',
      icon: IconReport,
    },
    {
      name: 'Export Data',
      url: '/export',
      icon: IconListDetails,
    },
  ],
};

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  return (
    <Sidebar collapsible="offcanvas" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              className="data-[slot=sidebar-menu-button]:!p-1.5"
            >
              <a href="/dashboard">
                <IconStar className="!size-5 fill-primary text-primary" />
                <span className="text-base font-semibold">BragDoc</span>
              </a>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={data.navMain} />
        <NavDocuments items={data.documents} />
        <NavSecondary items={data.navSecondary} className="mt-auto" />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={data.user} />
      </SidebarFooter>
    </Sidebar>
  );
}
