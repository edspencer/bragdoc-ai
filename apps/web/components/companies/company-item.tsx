'use client';

import { format } from 'date-fns';
import { IconCalendar, IconWorld } from '@tabler/icons-react';
import { Badge } from '@/components/ui/badge';
import type { Company } from '@/database/schema';
import { CompanyActions } from '@/components/companies/company-actions';

/**
 * CompanyItem - Displays a single company in clean, modern format
 *
 * Layout:
 * - Row 1: [Company Name] | spacer | [Edit] [Delete]
 * - Row 2: [Website icon + URL] (if exists)
 * - Row 3: [Role Badge]
 * - Row 4: [Calendar icon + Dates] | [Current Badge] (if applicable)
 *
 * @param company - The company to display
 * @param onEdit - Callback when edit button is clicked
 * @param onDelete - Callback when delete button is clicked with cascade options
 */
interface CompanyItemProps {
  company: Company;
  onEdit: (company: Company) => void;
  onDelete: (
    id: string,
    cascadeOptions: {
      deleteProjects: boolean;
      deleteAchievements: boolean;
      deleteDocuments: boolean;
      deleteStandups: boolean;
    },
  ) => Promise<void>;
}

export function CompanyItem({ company, onEdit, onDelete }: CompanyItemProps) {
  const startDate = format(company.startDate, 'MMM yyyy');
  const endDate = company.endDate
    ? format(company.endDate, 'MMM yyyy')
    : 'Present';
  const isCurrent = !company.endDate;

  return (
    <div className="flex flex-col gap-2">
      {/* Row 1: Company Name | Edit/Delete Actions */}
      <div className="flex items-start justify-between gap-2">
        <div className="text-lg font-medium">{company.name}</div>
        <div className="shrink-0">
          <CompanyActions
            companyId={company.id}
            companyName={company.name}
            onEdit={() => onEdit(company)}
            onDelete={(cascadeOptions) => onDelete(company.id, cascadeOptions)}
          />
        </div>
      </div>

      {/* Row 2: Website (if exists) */}
      {company.domain && (
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <IconWorld className="size-3" />
          <span>{company.domain}</span>
        </div>
      )}

      {/* Row 3: Role Badge */}
      <div>
        <Badge variant="outline" className="font-normal text-xs">
          {company.role}
        </Badge>
      </div>

      {/* Row 4: Dates | Current Badge */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <IconCalendar className="size-3" />
          <span>
            {startDate} - {endDate}
          </span>
        </div>
        {isCurrent && (
          <Badge variant="secondary" className="text-xs flex-shrink-0">
            Current
          </Badge>
        )}
      </div>
    </div>
  );
}
