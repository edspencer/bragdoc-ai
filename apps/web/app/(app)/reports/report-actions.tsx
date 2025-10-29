'use client';

import * as React from 'react';
import { IconPlus } from '@tabler/icons-react';
import Link from 'next/link';

import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export function ReportActions() {
  return (
    <>
      {/* Desktop: Show all buttons */}
      <div className="hidden lg:flex gap-2">
        <Button asChild>
          <Link href="/reports/new/weekly">
            <IconPlus className="size-4" />
            Weekly
          </Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/reports/new/monthly">
            <IconPlus className="size-4" />
            Monthly
          </Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/reports/new/custom">
            <IconPlus className="size-4" />
            Custom
          </Link>
        </Button>
      </div>

      {/* Mobile: Show dropdown */}
      <div className="lg:hidden">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button size="icon">
              <IconPlus className="size-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem asChild>
              <Link href="/reports/new/weekly" className="cursor-pointer">
                Weekly Report
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href="/reports/new/monthly" className="cursor-pointer">
                Monthly Report
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href="/reports/new/custom" className="cursor-pointer">
                Custom Report
              </Link>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </>
  );
}
