'use client';

import type * as React from 'react';
import {
  IconTarget,
  IconDashboard,
  IconBuilding,
  IconSettings,
  IconStar,
} from '@tabler/icons-react';
import { useSession } from 'next-auth/react';
import { useDocuments } from '@/hooks/use-documents';

import { NavDocuments } from '@/components/nav-documents';
import { NavMain } from '@/components/nav-main';
import { NavProjects } from '@/components/nav-projects';
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

const staticData = {
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
      title: 'Companies',
      url: '/companies',
      icon: IconBuilding,
    },
    // {
    //   title: 'Analytics',
    //   url: '/analytics',
    //   icon: IconChartBar,
    // },
  ],
  navSecondary: [
    {
      title: 'Account Settings',
      url: '/account',
      icon: IconSettings,
    },
    // {
    //   title: 'Get Help',
    //   url: '/help',
    //   icon: IconHelp,
    // },
    // {
    //   title: 'Search',
    //   url: '/search',
    //   icon: IconSearch,
    // },
  ],
};

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const { data: session, status } = useSession();
  const { documents } = useDocuments();

  const user = {
    name: session?.user?.name || 'User',
    email: session?.user?.email || '',
    avatar: session?.user?.image || '/avatars/user.jpg',
  };

  // Don't render until we have session data loaded
  if (status === 'loading') {
    return null;
  }

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
        <NavMain items={staticData.navMain} />
        <NavProjects />
        <NavDocuments documents={documents} />
        <NavSecondary items={staticData.navSecondary} className="mt-auto" />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={user} />
      </SidebarFooter>
    </Sidebar>
  );
}
