'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { cn } from 'lib/utils';
import { buttonVariants } from 'components/ui/button';

interface NavItem {
  title: string;
  href: string;
  description?: string;
}

const items: NavItem[] = [
  {
    title: 'GitHub',
    href: '/settings/github',
    description: 'Configure GitHub integration',
  },
  {
    title: 'Projects',
    href: '/settings/projects',
    description: 'Manage your projects',
  },
];

export function SettingsNav() {
  const pathname = usePathname();

  return (
    <div className="flex flex-col gap-2">
      {items.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className={cn(
            buttonVariants({ variant: 'ghost' }),
            pathname === item.href
              ? 'bg-muted hover:bg-muted'
              : 'hover:bg-transparent hover:underline',
            'justify-start',
          )}
        >
          {item.title}
        </Link>
      ))}
    </div>
  );
}
