'use client';

import * as React from 'react';
import { IconPlus } from '@tabler/icons-react';
import type { Company } from '@/database/schema';

import { Button } from 'components/ui/button';
import { CompaniesTable } from '@/components/companies-table';
import { CompaniesList } from '@/components/companies/companies-list';
import { SidebarInset } from '@/components/ui/sidebar';
import { SiteHeader } from '@/components/site-header';
import { CompanyDialog } from '@/components/company-dialog';
import {
  useCompanies,
  useCreateCompany,
  useUpdateCompany,
  useDeleteCompany,
} from '@/hooks/use-companies';
import { AppPage } from '@/components/shared/app-page';
import { AppContent } from '@/components/shared/app-content';

export default function CompaniesPage() {
  const { companies, isLoading } = useCompanies();
  const createCompany = useCreateCompany();
  const updateCompany = useUpdateCompany();
  const deleteCompany = useDeleteCompany();

  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [editingCompany, setEditingCompany] = React.useState<Company | null>(
    null,
  );

  const handleAddCompany = () => {
    setEditingCompany(null);
    setDialogOpen(true);
  };

  const handleEditCompany = (company: Company) => {
    setEditingCompany(company);
    setDialogOpen(true);
  };

  const handleDeleteCompany = async (
    id: string,
    cascadeOptions: {
      deleteProjects: boolean;
      deleteAchievements: boolean;
      deleteDocuments: boolean;
      deleteStandups: boolean;
    },
  ) => {
    try {
      await deleteCompany(id, cascadeOptions);
    } catch (error) {
      // Error is handled in the hook
      console.error('Failed to delete company:', error);
    }
  };

  const handleSubmitCompany = async (data: any) => {
    try {
      if (editingCompany) {
        await updateCompany(editingCompany.id, data);
      } else {
        await createCompany(data);
      }
      setDialogOpen(false);
      setEditingCompany(null);
    } catch (error) {
      // Error is handled in the hooks
      console.error('Failed to submit company:', error);
    }
  };

  return (
    <AppPage>
      <SidebarInset>
        <SiteHeader title="Companies">
          <Button onClick={handleAddCompany}>
            <IconPlus className="size-4" />
            <span className="hidden lg:inline">Add Company</span>
          </Button>
        </SiteHeader>
        <AppContent>
          {/* Desktop view: table layout */}
          <div className="hidden lg:block">
            <CompaniesTable
              data={companies || []}
              onEdit={handleEditCompany}
              onDelete={handleDeleteCompany}
              isLoading={isLoading}
            />
          </div>

          {/* Mobile view: list layout */}
          <div className="block lg:hidden">
            <CompaniesList
              companies={companies || []}
              onEdit={handleEditCompany}
              onDelete={handleDeleteCompany}
              isLoading={isLoading}
            />
          </div>
        </AppContent>
      </SidebarInset>
      <CompanyDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        company={editingCompany}
        onSubmit={handleSubmitCompany}
      />
    </AppPage>
  );
}
