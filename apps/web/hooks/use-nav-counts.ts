import useSWR from 'swr';

interface NavCounts {
  companies: number;
  projects: number;
  achievements: number;
  documents: number;
}

export function useNavCounts() {
  const { data, error } = useSWR<{ [key in keyof NavCounts]: number }>('/api/counts');

  return {
    counts: data
      ? {
          companies: Number(data.companies),
          projects: Number(data.projects),
          achievements: Number(data.achievements),
          documents: Number(data.documents),
        }
      : {
          companies: 0,
          projects: 0,
          achievements: 0,
          documents: 0,
        },
    isLoading: !error && !data,
    error,
  };
}