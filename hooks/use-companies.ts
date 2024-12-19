import useSWR from "swr";
import { toast } from "sonner";
import type { CompanyFormData } from "@/components/companies/company-form";

interface Company {
  id: string;
  name: string;
  domain: string | undefined;
  role: string;
  startDate: Date;
  endDate: Date | null;
}

const fetcher = async (url: string) => {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error("Failed to fetch companies");
  }
  const data = await res.json();
  return data.map((company: any) => ({
    ...company,
    startDate: new Date(company.startDate),
    endDate: company.endDate ? new Date(company.endDate) : null,
  }));
};

export function useCompanies() {
  const { data, error, mutate } = useSWR<Company[]>(
    "/api/companies",
    fetcher
  );

  return {
    companies: data,
    isLoading: !error && !data,
    isError: error,
    mutate,
  };
}

export function useCompany(id: string) {
  const { data, error, mutate } = useSWR<Company>(
    `/api/companies/${id}`,
    fetcher
  );

  return {
    company: data,
    isLoading: !error && !data,
    isError: error,
    mutate,
  };
}

export function useCreateCompany() {
  const { mutate: mutateList } = useCompanies();

  const createCompany = async (data: CompanyFormData) => {
    try {
      const res = await fetch("/api/companies", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!res.ok) {
        throw new Error("Failed to create company");
      }

      await mutateList();
      toast.success("Company created successfully");
    } catch (error) {
      console.error("Error creating company:", error);
      toast.error("Failed to create company");
      throw error;
    }
  };

  return createCompany;
}

export function useUpdateCompany() {
  const { mutate: mutateList } = useCompanies();

  const updateCompany = async (id: string, data: CompanyFormData) => {
    try {
      const res = await fetch(`/api/companies/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!res.ok) {
        throw new Error("Failed to update company");
      }

      await mutateList();
      toast.success("Company updated successfully");
    } catch (error) {
      console.error("Error updating company:", error);
      toast.error("Failed to update company");
      throw error;
    }
  };

  return updateCompany;
}

export function useDeleteCompany() {
  const { mutate: mutateList } = useCompanies();

  const deleteCompany = async (id: string) => {
    try {
      const res = await fetch(`/api/companies/${id}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        throw new Error("Failed to delete company");
      }

      await mutateList();
      toast.success("Company deleted successfully");
    } catch (error) {
      console.error("Error deleting company:", error);
      toast.error("Failed to delete company");
      throw error;
    }
  };

  return deleteCompany;
}
