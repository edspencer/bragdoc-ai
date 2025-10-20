import useSWR from 'swr';

interface Document {
  id: string;
  title: string;
  content: string;
  type?: string;
  companyId?: string;
  company?: {
    name: string;
  };
  createdAt: string;
  updatedAt: string;
  shareToken?: string;
}

interface DocumentsResponse {
  documents: Document[];
}

export function useDocuments() {
  const { data, error, isLoading, mutate } =
    useSWR<DocumentsResponse>('/api/documents');

  return {
    documents: data?.documents || [],
    error,
    isLoading,
    mutate,
  };
}
