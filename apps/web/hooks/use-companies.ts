import useSWR from 'swr';
import { toast } from 'sonner';
import { useConfetti } from 'hooks/useConfetti';
import * as z from 'zod/v3';
import type { Company } from '@/database/schema';

const formSchema = z.object({
  name: z.string().min(1, 'Company name is required').max(256),
  domain: z.string().max(256).optional(),
  role: z.string().min(1, 'Role is required').max(256),
  startDate: z.date({ required_error: 'Start date is required' }),
  endDate: z.date().nullable().optional(),
});

export type CompanyFormData = z.infer<typeof formSchema>;

const fetchCompanies = async (url: string) => {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error('Failed to fetch companies');
  }
  const data = await res.json();
  return data.map((company: any) => ({
    ...company,
    startDate: new Date(company.startDate),
    endDate: company.endDate ? new Date(company.endDate) : null,
    domain: company.domain ?? null,
  })) as Company[];
};

const fetchCompany = async (url: string) => {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error('Failed to fetch company');
  }
  const company = await res.json();
  return {
    ...company,
    startDate: new Date(company.startDate),
    endDate: company.endDate ? new Date(company.endDate) : null,
    domain: company.domain ?? null,
  } as Company;
};

export function useCompanies() {
  const { data, error, mutate } = useSWR<Company[]>(
    '/api/companies',
    fetchCompanies,
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
    fetchCompany,
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
  const { fire: fireConfetti } = useConfetti();

  const createCompany = async (data: CompanyFormData) => {
    try {
      const res = await fetch('/api/companies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!res.ok) {
        throw new Error('Failed to create company');
      }

      await mutateList();
      toast.success('Company created successfully');
      fireConfetti();
    } catch (error) {
      console.error('Error creating company:', error);
      toast.error('Failed to create company');
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
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!res.ok) {
        throw new Error('Failed to update company');
      }

      await mutateList();
      toast.success('Company updated successfully');
    } catch (error) {
      console.error('Error updating company:', error);
      toast.error('Failed to update company');
      throw error;
    }
  };

  return updateCompany;
}

export function useDeleteCompany() {
  const { mutate: mutateList } = useCompanies();

  const deleteCompany = async (
    id: string,
    cascadeOptions?: {
      deleteProjects: boolean;
      deleteAchievements: boolean;
      deleteDocuments: boolean;
      deleteStandups: boolean;
    },
  ) => {
    try {
      // Build query string if cascade options provided
      const queryParams = new URLSearchParams();
      if (cascadeOptions) {
        if (cascadeOptions.deleteProjects)
          queryParams.append('deleteProjects', 'true');
        if (cascadeOptions.deleteAchievements)
          queryParams.append('deleteAchievements', 'true');
        if (cascadeOptions.deleteDocuments)
          queryParams.append('deleteDocuments', 'true');
        if (cascadeOptions.deleteStandups)
          queryParams.append('deleteStandups', 'true');
      }

      const queryString = queryParams.toString();
      const url = `/api/companies/${id}${queryString ? `?${queryString}` : ''}`;

      const res = await fetch(url, {
        method: 'DELETE',
      });

      if (!res.ok) {
        throw new Error('Failed to delete company');
      }

      // Check if we have a JSON response (cascade delete) or empty response
      const contentType = res.headers.get('content-type');
      let deletedCounts = null;
      if (contentType?.includes('application/json')) {
        const data = await res.json();
        deletedCounts = data.deletedCounts;
      }

      await mutateList();

      // Show detailed toast if cascade delete occurred
      if (deletedCounts) {
        const deletedItems = [];
        if (deletedCounts.projects > 0)
          deletedItems.push(
            `${deletedCounts.projects} project${deletedCounts.projects > 1 ? 's' : ''}`,
          );
        if (deletedCounts.achievements > 0)
          deletedItems.push(
            `${deletedCounts.achievements} achievement${deletedCounts.achievements > 1 ? 's' : ''}`,
          );
        if (deletedCounts.documents > 0)
          deletedItems.push(
            `${deletedCounts.documents} document${deletedCounts.documents > 1 ? 's' : ''}`,
          );
        if (deletedCounts.standups > 0)
          deletedItems.push(
            `${deletedCounts.standups} standup${deletedCounts.standups > 1 ? 's' : ''}`,
          );

        if (deletedItems.length > 0) {
          toast.success(
            `Company deleted successfully. Also deleted: ${deletedItems.join(', ')}`,
          );
        } else {
          toast.success('Company deleted successfully');
        }
      } else {
        toast.success('Company deleted successfully');
      }
    } catch (error) {
      console.error('Error deleting company:', error);
      toast.error('Failed to delete company');
      throw error;
    }
  };

  return deleteCompany;
}

export function useCompanyRelatedCounts(id: string | null) {
  const { data, error, mutate } = useSWR<{
    projects: number;
    achievements: number;
    documents: number;
    standups: number;
  }>(id ? `/api/companies/${id}/related-counts` : null, async (url: string) => {
    const res = await fetch(url);
    if (!res.ok) {
      throw new Error('Failed to fetch counts');
    }
    return res.json();
  });

  return {
    counts: data,
    isLoading: !error && !data,
    isError: error,
    mutate,
  };
}
