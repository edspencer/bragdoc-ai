'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { IconUsers, IconUserCheck } from '@tabler/icons-react';
import type { Icon } from '@tabler/icons-react';

import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from '@/components/ui/sidebar';
import { cn } from '@/lib/utils';

const careerItems: { title: string; url: string; icon: Icon }[] = [
  {
    title: 'Standup',
    url: '/standup',
    icon: IconUsers,
  },
  {
    title: 'Reports',
    url: '/reports',
    icon: IconUserCheck,
  },
];

export function NavCareers() {
  const pathname = usePathname();
  const { isMobile, setOpenMobile } = useSidebar();

  const handleLinkClick = () => {
    if (isMobile) {
      setOpenMobile(false);
    }
  };

  return (
    <SidebarGroup className="group-data-[collapsible=icon]:hidden">
      <SidebarGroupLabel>Beta</SidebarGroupLabel>
      <SidebarMenu>
        {careerItems.map((item) => {
          const isActive = pathname.startsWith(item.url);
          return (
            <SidebarMenuItem key={item.title}>
              <SidebarMenuButton
                asChild
                className={cn(
                  isActive &&
                    'bg-primary text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground active:bg-primary/90 active:text-primary-foreground font-medium',
                )}
              >
                <Link href={item.url} onClick={handleLinkClick}>
                  <item.icon />
                  <span>{item.title}</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          );
        })}
      </SidebarMenu>
    </SidebarGroup>
  );
}
