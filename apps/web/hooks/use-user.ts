import { useCallback, useEffect, useState } from 'react';
import type { User } from '@/database/schema';
import { useSession } from 'next-auth/react';

interface UseUserResponse {
  user: User | null;
  error: Error | null;
  isLoading: boolean;
  mutate: () => Promise<void>;
  updateUser: (data: Partial<User>) => Promise<void>;
}

export function useUser(): UseUserResponse {
  const { data: session } = useSession();
  const [user, setUser] = useState<User | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchUser = useCallback(async () => {
    if (!session?.user?.id) return;

    try {
      const response = await fetch('/api/user');
      if (!response.ok) {
        throw new Error('Failed to fetch user');
      }
      const data = await response.json();
      setUser(data);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Unknown error'));
    } finally {
      setIsLoading(false);
    }
  }, [session?.user?.id]);

  const updateUser = useCallback(
    async (data: Partial<User>) => {
      if (!session?.user?.id) return;

      try {
        const response = await fetch('/api/user', {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(data),
        });

        if (!response.ok) {
          throw new Error('Failed to update user');
        }

        const updatedUser = await response.json();
        setUser(updatedUser);
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Unknown error'));
        throw err;
      }
    },
    [session?.user?.id]
  );

  const mutate = useCallback(async () => {
    setIsLoading(true);
    await fetchUser();
  }, [fetchUser]);

  useEffect(() => {
    fetchUser();
  }, [fetchUser]);

  return {
    user,
    error,
    isLoading,
    mutate,
    updateUser,
  };
}
