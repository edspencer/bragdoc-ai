"use client";

import { CompanyList } from "@/components/companies/company-list";
import { CompanyFilters } from "@/components/companies/company-filters";
import {
  useCompanies,
  useCreateCompany,
  useUpdateCompany,
  useDeleteCompany,
} from "@/hooks/use-companies";
import { useState } from "react";

export default function CompaniesPage() {
  const { companies, isLoading } = useCompanies();
  const createCompany = useCreateCompany();
  const updateCompany = useUpdateCompany();
  const deleteCompany = useDeleteCompany();

  const [filter, setFilter] = useState<"all" | "current" | "past">("all");
  const [searchQuery, setSearchQuery] = useState("");

  const filteredCompanies = companies?.filter((company) => {
    if (searchQuery && !company.name.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false;
    }
    if (filter === "current") return !company.endDate;
    if (filter === "past") return company.endDate;
    return true;
  });

  return (
    <div className="space-y-6 p-6">
      <div>
        <h3 className="text-lg font-medium">Companies</h3>
        <p className="text-sm text-muted-foreground">
          Manage the companies you&apos;ve worked with
        </p>
      </div>
      <CompanyFilters
        filter={filter}
        setFilter={setFilter}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
      />
      <CompanyList
        companies={filteredCompanies}
        isLoading={isLoading}
        onCreateCompany={createCompany}
        onUpdateCompany={updateCompany}
        onDeleteCompany={deleteCompany}
      />
    </div>
  );
}
