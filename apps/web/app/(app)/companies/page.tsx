'use client';

import { AppPage } from 'components/shared/app-page';
import { CompanyList } from 'components/companies/company-list';
import {
  useCompanies,
  useCreateCompany,
  useUpdateCompany,
  useDeleteCompany,
} from 'hooks/use-companies';

export default function CompaniesPage() {
  const { companies, isLoading } = useCompanies();
  const createCompany = useCreateCompany();
  const updateCompany = useUpdateCompany();
  const deleteCompany = useDeleteCompany();

  return (
    <AppPage>
      <CompanyList
        companies={companies!}
        isLoading={isLoading}
        onCreateCompany={createCompany}
        onUpdateCompany={updateCompany}
        onDeleteCompany={deleteCompany}
      />
    </AppPage>
  );
}
