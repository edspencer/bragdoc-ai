"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CompanyList } from "@/components/companies/company-list";
import { CompanyFilters } from "@/components/companies/company-filters";
import {
  useCompanies,
  useCreateCompany,
  useUpdateCompany,
  useDeleteCompany,
} from "@/hooks/use-companies";
import { useState, useMemo } from "react";

export default function SettingsPage() {
  const { companies, isLoading } = useCompanies();
  const createCompany = useCreateCompany();
  const updateCompany = useUpdateCompany();
  const deleteCompany = useDeleteCompany();

  const [filter, setFilter] = useState<"all" | "current" | "past">("all");
  const [searchQuery, setSearchQuery] = useState("");

  const filteredCompanies = useMemo(() => {
    if (!companies) return [];

    let filtered = [...companies];

    // Apply status filter
    if (filter === "current") {
      filtered = filtered.filter((company) => !company.endDate);
    } else if (filter === "past") {
      filtered = filtered.filter((company) => company.endDate);
    }

    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (company) =>
          company.name.toLowerCase().includes(query) ||
          company.role.toLowerCase().includes(query) ||
          (company.domain?.toLowerCase().includes(query))
      );
    }

    return filtered;
  }, [companies, filter, searchQuery]);

  return (
    <div className="container mx-auto py-10">
      <Tabs defaultValue="companies" className="w-full">
        <TabsList>
          <TabsTrigger value="companies">Companies</TabsTrigger>
          <TabsTrigger value="github">GitHub</TabsTrigger>
          {/* Add more settings tabs as needed */}
        </TabsList>

        <TabsContent value="companies" className="space-y-6">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">Companies</h2>
            <p className="text-muted-foreground">
              Manage your work history and company associations.
            </p>
          </div>

          <CompanyFilters
            filter={filter}
            onFilterChange={setFilter}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
          />

          <CompanyList
            companies={filteredCompanies}
            onCreateCompany={createCompany}
            onUpdateCompany={updateCompany}
            onDeleteCompany={deleteCompany}
            isLoading={isLoading}
          />
        </TabsContent>

        <TabsContent value="github">
          {/* GitHub settings content */}
        </TabsContent>
      </Tabs>
    </div>
  );
}
