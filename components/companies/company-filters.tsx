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
import { MagnifyingGlassIcon } from "@radix-ui/react-icons";

interface CompanyFiltersProps {
  filter: "all" | "current" | "past";
  onFilterChange: (value: "all" | "current" | "past") => void;
  searchQuery: string;
  onSearchChange: (value: string) => void;
}

export function CompanyFilters({
  filter,
  onFilterChange,
  searchQuery,
  onSearchChange,
}: CompanyFiltersProps) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-2">
        <Select value={filter} onValueChange={onFilterChange}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filter companies" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Companies</SelectItem>
            <SelectItem value="current">Current Companies</SelectItem>
            <SelectItem value="past">Past Companies</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="relative">
        <MagnifyingGlassIcon className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500 dark:text-gray-400" />
        <Input
          type="search"
          placeholder="Search companies..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-8"
        />
      </div>
    </div>
  );
}
