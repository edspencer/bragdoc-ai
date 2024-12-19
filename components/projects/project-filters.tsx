"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  MagnifyingGlassIcon,
  ResetIcon,
} from "@radix-ui/react-icons";
import { motion } from "framer-motion";
import { ProjectStatus } from "@/lib/db/types";
import { cn } from "@/lib/utils";
import { Loader2Icon } from "lucide-react";

interface Company {
  id: string;
  name: string;
}

interface ProjectFiltersProps {
  status: ProjectStatus | "all";
  onStatusChange: (value: ProjectStatus | "all") => void;
  companyId: string | "all";
  onCompanyChange: (value: string) => void;
  searchQuery: string;
  onSearchChange: (value: string) => void;
  companies: Company[];
  onReset: () => void;
  loading?: {
    status: boolean;
    company: boolean;
    search: boolean;
  };
}

const statusOptions: { value: ProjectStatus | "all"; label: string }[] = [
  { value: "all", label: "All Projects" },
  { value: "active", label: "Active Projects" },
  { value: "completed", label: "Completed Projects" },
  { value: "archived", label: "Archived Projects" },
];

export function ProjectFilters({
  status,
  onStatusChange,
  companyId,
  onCompanyChange,
  searchQuery,
  onSearchChange,
  companies,
  onReset,
  loading = {
    status: false,
    company: false,
    search: false,
  },
}: ProjectFiltersProps) {
  const hasFilters =
    status !== "all" || companyId !== "all" || searchQuery.length > 0;

  const isLoading = loading.status || loading.company || loading.search;

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <Select
          value={status}
          onValueChange={onStatusChange}
          disabled={loading.status}
        >
          <SelectTrigger className={cn(
            "w-[180px]",
            loading.status && "opacity-70"
          )}>
            <SelectValue placeholder="Filter by status" />
            {loading.status && (
              <Loader2Icon className="ml-2 h-4 w-4 animate-spin" />
            )}
          </SelectTrigger>
          <SelectContent>
            {statusOptions.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={companyId}
          onValueChange={onCompanyChange}
          disabled={loading.company}
        >
          <SelectTrigger className={cn(
            "w-[180px]",
            loading.company && "opacity-70"
          )}>
            <SelectValue placeholder="Filter by company" />
            {loading.company && (
              <Loader2Icon className="ml-2 h-4 w-4 animate-spin" />
            )}
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Companies</SelectItem>
            {companies.map((company) => (
              <SelectItem key={company.id} value={company.id}>
                {company.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {hasFilters && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="sm:ml-2"
          >
            <Button
              variant="ghost"
              size="sm"
              onClick={onReset}
              disabled={isLoading}
              className={cn(
                "h-8 px-2 lg:px-3",
                isLoading && "opacity-70"
              )}
            >
              {isLoading ? (
                <Loader2Icon className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <ResetIcon className="mr-2 h-4 w-4" />
              )}
              Reset
            </Button>
          </motion.div>
        )}
      </div>

      <motion.div
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.3, delay: 0.1 }}
        className="relative"
      >
        <MagnifyingGlassIcon className={cn(
          "absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground",
          loading.search && "opacity-70"
        )} />
        <Input
          type="search"
          placeholder="Search projects..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          disabled={loading.search}
          className={cn(
            "pl-8 transition-shadow duration-200",
            "w-full sm:w-[250px]",
            "focus-visible:ring-2 focus-visible:ring-primary",
            loading.search && "opacity-70"
          )}
        />
        {loading.search && (
          <div className="absolute right-2.5 top-2.5">
            <Loader2Icon className="h-4 w-4 animate-spin text-muted-foreground" />
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}
