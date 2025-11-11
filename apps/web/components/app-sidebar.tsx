'use client';

import type * as React from 'react';
import type { ProjectWithImpact } from '@bragdoc/database';
import {
  IconTarget,
  IconDashboard,
  IconBuilding,
  IconSettings,
  IconTrendingUp,
} from '@tabler/icons-react';
import Image from 'next/image';

import { NavCareers } from '@/components/nav-careers';
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
  useSidebar,
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
      title: 'Workstreams',
      url: '/workstreams',
      icon: IconTrendingUp,
      badge: 'NEW',
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

interface AppSidebarProps extends React.ComponentProps<typeof Sidebar> {
  user:
    | {
        id: string;
        name?: string;
        email?: string;
        image?: string;
      }
    | undefined;
  isDemoMode: boolean;
  topProjects: ProjectWithImpact[];
}

export function AppSidebar({
  user,
  isDemoMode,
  topProjects,
  ...props
}: AppSidebarProps) {
  const { isMobile, setOpenMobile } = useSidebar();

  const navUserData = {
    name: user?.name || 'User',
    email: user?.email || '',
    avatar: user?.image || '/avatars/user.jpg',
  };

  const handleLogoClick = () => {
    if (isMobile) {
      setOpenMobile(false);
    }
  };

  return (
    <Sidebar collapsible="offcanvas" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              className="data-[slot=sidebar-menu-button]:!p-1.5"
            >
              <a href="/dashboard" onClick={handleLogoClick}>
                <Image
                  src="/icon.svg"
                  alt="BragDoc"
                  width={20}
                  height={20}
                  className="!size-5"
                />
                <span className="text-base font-semibold">BragDoc</span>
              </a>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={staticData.navMain} />
        <NavProjects projects={topProjects} />
        <NavCareers />
        <NavSecondary items={staticData.navSecondary} className="mt-auto" />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={navUserData} />
      </SidebarFooter>
    </Sidebar>
  );
}
