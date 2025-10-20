import { useState, useCallback } from 'react';

interface RetryOptions {
  maxAttempts?: number;
  delayMs?: number;
}

export function useRetry<T>() {
  const [attemptCount, setAttemptCount] = useState(0);
  const [isRetrying, setIsRetrying] = useState(false);

  const executeWithRetry = useCallback(
    async (
      operation: () => Promise<T>,
      { maxAttempts = 3, delayMs = 1000 }: RetryOptions = {},
    ): Promise<T> => {
      setIsRetrying(true);
      try {
        const result = await operation();
        setAttemptCount(0);
        return result;
      } catch (error) {
        setAttemptCount((prev) => prev + 1);

        if (attemptCount < maxAttempts - 1) {
          await new Promise((resolve) => setTimeout(resolve, delayMs));
          return executeWithRetry(operation, { maxAttempts, delayMs });
        }

        throw error;
      } finally {
        setIsRetrying(false);
      }
    },
    [attemptCount],
  );

  return {
    executeWithRetry,
    attemptCount,
    isRetrying,
  };
}
