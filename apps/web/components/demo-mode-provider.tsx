'use client';

import { createContext, useContext, useState, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';

/**
 * Demo Mode Context Type
 *
 * Provides state and actions for managing per-user demo mode.
 * Demo mode is determined by checking if the session has `impersonatedBy` set,
 * which indicates the user is viewing their shadow demo user's data.
 */
interface DemoModeContextType {
  /**
   * Whether the user is currently in per-user demo mode (viewing shadow user data)
   */
  isDemoMode: boolean;

  /**
   * Whether the user is a standalone demo account (user.level === 'demo')
   * These users cannot toggle demo mode as they don't have a "real" account
   */
  isStandaloneDemoUser: boolean;

  /**
   * Whether an async operation is in progress
   */
  isLoading: boolean;

  /**
   * Toggle demo mode on/off
   * When entering demo mode: creates shadow user (if needed) and swaps session
   * When exiting demo mode: restores session to real user
   */
  toggleDemoMode: () => Promise<void>;

  /**
   * Reset demo data to initial state
   * Only works when in demo mode
   */
  resetDemoData: () => Promise<void>;
}

const DemoModeContext = createContext<DemoModeContextType | undefined>(
  undefined,
);

/**
 * Demo Mode Provider Props
 */
interface DemoModeProviderProps {
  children: ReactNode;
  /**
   * Initial per-user demo mode state from server
   * Determined by checking session.impersonatedBy on the server
   */
  initialDemoMode: boolean;
  /**
   * Whether the user is a standalone demo account (user.level === 'demo')
   * These users cannot toggle demo mode
   */
  isStandaloneDemoUser?: boolean;
}

/**
 * Demo Mode Provider Component
 *
 * Provides React context for per-user demo mode state and actions.
 * Wrap this around authenticated app content to enable demo mode toggling.
 *
 * The initial state is determined server-side by checking if the session
 * has `impersonatedBy` set (indicating the user is viewing their shadow user's data).
 *
 * @example
 * ```tsx
 * // In app layout (server component)
 * const isDemoMode = session?.impersonatedBy != null;
 *
 * <DemoModeProvider initialDemoMode={isDemoMode}>
 *   {children}
 * </DemoModeProvider>
 * ```
 */
export function DemoModeProvider({
  children,
  initialDemoMode,
  isStandaloneDemoUser = false,
}: DemoModeProviderProps) {
  const [isDemoMode, _setIsDemoMode] = useState(initialDemoMode);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const toggleDemoMode = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/demo-mode/toggle', {
        method: 'POST',
        credentials: 'include',
      });
      if (res.ok) {
        // Cookie is set by response - reload to pick up new session
        // Full page reload ensures all server components re-fetch with new session
        window.location.reload();
      } else {
        const data = await res.json();
        console.error('Failed to toggle demo mode:', data.error);
      }
    } catch (error) {
      console.error('Failed to toggle demo mode:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const resetDemoData = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/demo-mode/reset', {
        method: 'POST',
        credentials: 'include',
      });
      if (res.ok) {
        // Data reset - refresh the page to show new data
        router.refresh();
      } else {
        const data = await res.json();
        console.error('Failed to reset demo data:', data.error);
      }
    } catch (error) {
      console.error('Failed to reset demo data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <DemoModeContext.Provider
      value={{
        isDemoMode,
        isStandaloneDemoUser,
        isLoading,
        toggleDemoMode,
        resetDemoData,
      }}
    >
      {children}
    </DemoModeContext.Provider>
  );
}

/**
 * Hook to access demo mode context
 *
 * Must be used within a DemoModeProvider component.
 *
 * @throws Error if used outside of DemoModeProvider
 *
 * @example
 * ```tsx
 * function DemoToggle() {
 *   const { isDemoMode, isLoading, toggleDemoMode } = useDemoMode();
 *
 *   return (
 *     <button onClick={toggleDemoMode} disabled={isLoading}>
 *       {isDemoMode ? 'Exit Demo' : 'Try Demo'}
 *     </button>
 *   );
 * }
 * ```
 */
export function useDemoMode(): DemoModeContextType {
  const context = useContext(DemoModeContext);
  if (context === undefined) {
    throw new Error('useDemoMode must be used within a DemoModeProvider');
  }
  return context;
}
