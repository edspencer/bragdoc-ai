'use client';

import * as React from 'react';
import { IconBuilding, IconPlus } from '@tabler/icons-react';
import { toast } from 'sonner';
import type { Company } from '@/database/schema';

import { Button } from 'components/ui/button';
import { CompaniesTable } from '@/components/companies-table';
import { AppSidebar } from '@/components/app-sidebar';
import { SiteHeader } from '@/components/site-header';
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar';
import { CompanyDialog } from '@/components/company-dialog';

// Mock data for companies - replace with real data from your database
const mockCompanies: Company[] = [
  {
    id: '1',
    userId: '1',
    name: 'Acme Corp',
    domain: 'acme.com',
    role: 'Senior Software Engineer',
    startDate: new Date('2022-01-15'),
    endDate: new Date('2024-03-30'),
  },
  {
    id: '2',
    userId: '1',
    name: 'TechStart Inc',
    domain: 'techstart.io',
    role: 'Full Stack Developer',
    startDate: new Date('2021-06-01'),
    endDate: null, // Current job
  },
  {
    id: '3',
    userId: '1',
    name: 'Innovation Labs',
    domain: 'innovationlabs.com',
    role: 'Frontend Developer',
    startDate: new Date('2020-03-15'),
    endDate: new Date('2021-05-30'),
  },
];

export default function CompaniesPage() {
  const [companies, setCompanies] = React.useState(mockCompanies);
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

  const handleDeleteCompany = (id: string) => {
    setCompanies((prev) => prev.filter((company) => company.id !== id));
    toast.success('Company deleted successfully');
  };

  const handleSubmitCompany = (data: Omit<Company, 'id'>) => {
    if (editingCompany) {
      setCompanies((prev) =>
        prev.map((company) =>
          company.id === editingCompany.id
            ? { ...data, id: editingCompany.id }
            : company,
        ),
      );
      toast.success('Company updated successfully');
    } else {
      const newCompany = {
        ...data,
        id: Math.random().toString(36).substr(2, 9),
      };
      setCompanies((prev) => [...prev, newCompany]);
      toast.success('Company added successfully');
    }
  };

  return (
    <SidebarProvider
      style={
        {
          '--sidebar-width': 'calc(var(--spacing) * 72)',
          '--header-height': 'calc(var(--spacing) * 12)',
        } as React.CSSProperties
      }
    >
      <AppSidebar variant="inset" />
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
                data={companies}
                onEdit={handleEditCompany}
                onDelete={handleDeleteCompany}
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
    </SidebarProvider>
  );
}
