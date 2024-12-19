'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { Building2, FolderKanban, Trophy, Settings, Sun, Moon, LogOut } from 'lucide-react';
import { signOut } from 'next-auth/react';
import { useTheme } from 'next-themes';
import type { User } from 'next-auth';

import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { SidebarMenu, SidebarMenuItem } from '@/components/ui/sidebar';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';

export function SidebarNav({ user }: { user: User }) {
  const pathname = usePathname();
  const { setTheme, theme } = useTheme();

  // Get user initials from name or email
  const getInitials = () => {
    if (user.name) {
      return user.name
        .split(' ')
        .map(n => n[0])
        .join('')
        .toUpperCase();
    }
    return user.email?.[0].toUpperCase() || '?';
  };

  const navItems = [
    {
      href: '/companies',
      icon: Building2,
      label: 'Companies',
    },
    {
      href: '/projects',
      icon: FolderKanban,
      label: 'Projects',
    },
    {
      href: '/achievements',
      icon: Trophy,
      label: 'Achievements',
    },
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
                  className={`flex items-center gap-2 rounded-md p-2 text-sm font-medium hover:bg-accent hover:text-accent-foreground ${
                    isActive ? 'bg-accent text-accent-foreground' : ''
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  <span>{item.label}</span>
                </Link>
              </SidebarMenuItem>
            );
          })}
        </div>

        {/* Bottom Actions Row */}
        <div className="flex items-center justify-between px-2 py-2 border-t">
          {/* User Avatar */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Link href="/settings" className="block">
                <Avatar className="h-8 w-8">
                  <AvatarImage
                    src={user.image || `https://avatar.vercel.sh/${user.email}`}
                    alt={user.name || user.email || 'User avatar'}
                  />
                  <AvatarFallback>{getInitials()}</AvatarFallback>
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
                  className="p-2"
                  onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                >
                  {theme === 'dark' ? (
                    <Sun className="h-4 w-4" />
                  ) : (
                    <Moon className="h-4 w-4" />
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
                  className="p-2 rounded-md hover:bg-accent hover:text-accent-foreground"
                >
                  <Settings className="h-4 w-4" />
                </Link>
              </TooltipTrigger>
              <TooltipContent side="top">Settings</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="p-2"
                  onClick={() => signOut({ redirectTo: '/' })}
                >
                  <LogOut className="h-4 w-4" />
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
