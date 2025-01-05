'use client';

import { AppPage } from '@/components/shared/app-page';
import { CompanyList } from '@/components/companies/company-list';
import { CompanyFilters } from '@/components/companies/company-filters';
import {
  useCompanies,
  useCreateCompany,
  useUpdateCompany,
  useDeleteCompany,
} from '@/hooks/use-companies';
import { useState } from 'react';

export default function CompaniesPage() {
  const { companies, isLoading } = useCompanies();
  const createCompany = useCreateCompany();
  const updateCompany = useUpdateCompany();
  const deleteCompany = useDeleteCompany();

  const [filter, setFilter] = useState<'all' | 'current' | 'past'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredCompanies =
    companies?.filter((company) => {
      if (
        searchQuery &&
        !company.name.toLowerCase().includes(searchQuery.toLowerCase())
      ) {
        return false;
      }
      if (filter === 'current') return !company.endDate;
      if (filter === 'past') return company.endDate;
      return true;
    }) ?? [];

  return (
    <AppPage
      title="Companies"
      description="Manage your companies and work history"
    >
      <CompanyFilters
        filter={filter}
        onFilterChange={setFilter}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
      />
      <CompanyList
        companies={filteredCompanies}
        isLoading={isLoading}
        onCreateCompany={createCompany}
        onUpdateCompany={updateCompany}
        onDeleteCompany={deleteCompany}
      />
    </AppPage>
  );
}
