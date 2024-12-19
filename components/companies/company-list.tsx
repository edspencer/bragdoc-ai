"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { PlusIcon } from "@radix-ui/react-icons";
import { format } from "date-fns";
import { CompanyActions } from "./company-actions";
import { CompanyDialog } from "./company-dialog";
import { CompanyListSkeleton } from "./company-list-skeleton";
import { useState } from "react";
import type { CompanyFormData } from "./company-form";
import { motion } from "framer-motion";

interface Company {
  id: string;
  name: string;
  domain: string | undefined;
  role: string;
  startDate: Date;
  endDate: Date | null;
}

interface CompanyListProps {
  companies: Company[];
  onCreateCompany: (data: CompanyFormData) => Promise<void>;
  onUpdateCompany: (id: string, data: CompanyFormData) => Promise<void>;
  onDeleteCompany: (id: string) => Promise<void>;
  isLoading?: boolean;
}

export function CompanyList({
  companies,
  onCreateCompany,
  onUpdateCompany,
  onDeleteCompany,
  isLoading = false,
}: CompanyListProps) {
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editCompany, setEditCompany] = useState<Company | null>(null);

  if (isLoading) {
    return <CompanyListSkeleton />;
  }

  const sortedCompanies = [...companies].sort(
    (a, b) => b.startDate.getTime() - a.startDate.getTime()
  );

  const handleEdit = (company: Company) => {
    setEditCompany(company);
  };

  const handleEditSubmit = async (data: CompanyFormData) => {
    if (editCompany) {
      await onUpdateCompany(editCompany.id, data);
      setEditCompany(null);
    }
  };

  const handleCreate = async (data: CompanyFormData) => {
    await onCreateCompany(data);
    setCreateDialogOpen(false);
  };

  if (companies.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col items-center justify-center p-8 text-center"
      >
        <h3 className="mt-2 text-sm font-semibold text-gray-900 dark:text-gray-100">
          No companies
        </h3>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Get started by adding a company to your work history.
        </p>
        <div className="mt-6">
          <Button onClick={() => setCreateDialogOpen(true)}>
            <PlusIcon className="mr-2 size-4" />
            Add Company
          </Button>
        </div>

        <CompanyDialog
          open={createDialogOpen}
          onOpenChange={setCreateDialogOpen}
          onSubmit={handleCreate}
          mode="create"
          isLoading={isLoading}
        />
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      <div className="mb-4 flex justify-end">
        <Button onClick={() => setCreateDialogOpen(true)}>
          <PlusIcon className="mr-2 size-4" />
          Add Company
        </Button>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="min-w-[200px]">Company</TableHead>
              <TableHead className="min-w-[120px]">Role</TableHead>
              <TableHead className="min-w-[120px]">Start Date</TableHead>
              <TableHead className="min-w-[120px]">End Date</TableHead>
              <TableHead className="w-[100px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedCompanies.map((company, index) => (
              <motion.tr
                key={company.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className="group"
              >
                <TableCell>
                  <div>
                    <div className="font-medium transition-colors group-hover:text-primary">
                      {company.name}
                    </div>
                    {company.domain && (
                      <div className="text-sm text-muted-foreground">
                        {company.domain}
                      </div>
                    )}
                  </div>
                </TableCell>
                <TableCell>{company.role}</TableCell>
                <TableCell>{format(company.startDate, "MMM yyyy")}</TableCell>
                <TableCell>
                  {company.endDate
                    ? format(company.endDate, "MMM yyyy")
                    : "Present"}
                </TableCell>
                <TableCell>
                  <CompanyActions
                    onEdit={() => handleEdit(company)}
                    onDelete={() => onDeleteCompany(company.id)}
                    isLoading={isLoading}
                  />
                </TableCell>
              </motion.tr>
            ))}
          </TableBody>
        </Table>
      </div>

      <CompanyDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        onSubmit={handleCreate}
        mode="create"
        isLoading={isLoading}
      />

      <CompanyDialog
        open={!!editCompany}
        onOpenChange={() => setEditCompany(null)}
        initialData={editCompany || undefined}
        onSubmit={handleEditSubmit}
        mode="edit"
        isLoading={isLoading}
      />
    </motion.div>
  );
}
