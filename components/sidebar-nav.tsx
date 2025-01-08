'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Building2,
  FolderKanban,
  Trophy,
  Settings,
  Sun,
  Moon,
  LogOut,
} from 'lucide-react';
import { signOut } from 'next-auth/react';
import { useTheme } from 'next-themes';
import type { User } from 'next-auth';

import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { SidebarMenu, SidebarMenuItem, SidebarMenuBadge, useSidebar } from '@/components/ui/sidebar';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { useNavCounts } from '@/hooks/use-nav-counts';

export function SidebarNav({ user }: { user: User }) {
  const pathname = usePathname();
  const { setTheme, theme } = useTheme();
  const { counts } = useNavCounts();
  const { setOpenMobile } = useSidebar();

  // Get user initials from name or email
  const getInitials = () => {
    if (user.name) {
      return user.name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase();
    }
    return user.email?.[0].toUpperCase() || '?';
  };

  const navItems = [
    {
      href: '/achievements',
      icon: Trophy,
      label: 'Achievements',
      count: counts.achievements,
    },
    // {
    //   href: '/documents',
    //   icon: FileText,
    //   label: 'Documents',
    //   count: counts.documents,
    // },
    {
      href: '/companies',
      icon: Building2,
      label: 'Companies',
      count: counts.companies,
    },
    {
      href: '/projects',
      icon: FolderKanban,
      label: 'Projects',
      count: counts.projects,
    }
  ];

  return (
    <SidebarMenu>
      <div className="flex flex-col h-full">
        {/* Navigation Links */}
        <div className="flex-1 py-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;

            return (
              <SidebarMenuItem key={item.href}>
                <Link
                  href={item.href}
                  onClick={() => setOpenMobile(false)}
                  className={`flex items-center gap-2 rounded-md p-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground ${
                    isActive
                      ? 'bg-accent text-accent-foreground'
                      : 'text-muted-foreground'
                  }`}
                >
                  <Icon className="size-4" />
                  <span>{item.label}</span>
                  <SidebarMenuBadge className="ml-auto">
                    {item.count}
                  </SidebarMenuBadge>
                </Link>
              </SidebarMenuItem>
            );
          })}
        </div>

        {/* Bottom Actions Row */}
        <div className="flex items-center justify-between p-2 border-t border-border">
          {/* User Avatar */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Link
                href="/settings"
                className="block transition-opacity hover:opacity-80"
                onClick={() => setOpenMobile(false)}
              >
                <Avatar className="size-8">
                  <AvatarImage
                    src={user.image || `https://avatar.vercel.sh/${user.email}`}
                    alt={user.name || user.email || 'User avatar'}
                  />
                  <AvatarFallback className="bg-muted text-muted-foreground">
                    {getInitials()}
                  </AvatarFallback>
                </Avatar>
              </Link>
            </TooltipTrigger>
            <TooltipContent side="top">
              {user.name || user.email}
            </TooltipContent>
          </Tooltip>

          {/* Action Buttons */}
          <div className="flex items-center gap-1">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-8 p-0 transition-colors hover:bg-accent hover:text-accent-foreground"
                  onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                >
                  {theme === 'dark' ? (
                    <Sun className="size-4" />
                  ) : (
                    <Moon className="size-4" />
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent side="top">
                Toggle {theme === 'light' ? 'dark' : 'light'} mode
              </TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Link
                  href="/settings"
                  className="inline-flex size-8 items-center justify-center rounded-md transition-colors hover:bg-accent hover:text-accent-foreground"
                  onClick={() => setOpenMobile(false)}
                >
                  <Settings className="size-4" />
                </Link>
              </TooltipTrigger>
              <TooltipContent side="top">Settings</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-8 p-0 transition-colors hover:bg-accent hover:text-accent-foreground"
                  onClick={() => signOut({ redirectTo: '/' })}
                >
                  <LogOut className="size-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="top">Sign out</TooltipContent>
            </Tooltip>
          </div>
        </div>
      </div>
    </SidebarMenu>
  );
}
