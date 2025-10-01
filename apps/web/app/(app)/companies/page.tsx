'use client';

import * as React from 'react';
import { IconBuilding, IconPlus } from '@tabler/icons-react';
import type { Company } from '@/database/schema';

import { Button } from 'components/ui/button';
import { CompaniesTable } from '@/components/companies-table';
import { SiteHeader } from '@/components/site-header';
import { SidebarInset } from '@/components/ui/sidebar';
import { CompanyDialog } from '@/components/company-dialog';
import {
  useCompanies,
  useCreateCompany,
  useUpdateCompany,
  useDeleteCompany,
} from '@/hooks/use-companies';
import { AppPage } from '@/components/shared/app-page';

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

  const handleDeleteCompany = async (id: string) => {
    try {
      await deleteCompany(id);
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
        <SiteHeader />
        <div className="flex flex-1 flex-col">
          <div className="@container/main flex flex-1 flex-col gap-2">
            <div className="flex flex-col gap-6 p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10">
                    <IconBuilding className="size-5 text-primary" />
                  </div>
                  <div>
                    <h1 className="text-2xl font-semibold">Companies</h1>
                    <p className="text-muted-foreground text-sm">
                      Manage the companies you&apos;ve worked for
                    </p>
                  </div>
                </div>
                <Button onClick={handleAddCompany}>
                  <IconPlus className="size-4" />
                  Add Company
                </Button>
              </div>

              <CompaniesTable
                data={companies || []}
                onEdit={handleEditCompany}
                onDelete={handleDeleteCompany}
                isLoading={isLoading}
              />
            </div>
          </div>
        </div>
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
