import { useEffect, useState } from 'react';
import useSWR from 'swr';

interface NavCounts {
  companies: number;
  projects: number;
  achievements: number;
  documents: number;
}

export function useNavCounts() {
  const { data, error } = useSWR<NavCounts>('/api/counts');

  return {
    counts: data ?? {
      companies: 0,
      projects: 0,
      achievements: 0,
      documents: 0,
    },
    isLoading: !error && !data,
    error,
  };
}
