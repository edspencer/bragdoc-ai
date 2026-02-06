'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import { UpgradeModal } from './upgrade-modal';

/**
 * Credit status data structure
 */
export interface CreditStatus {
  freeCredits: number;
  freeChatMessages: number;
  isUnlimited: boolean;
  subscriptionType: 'free' | 'yearly' | 'lifetime' | 'demo';
  daysRemaining?: number;
}

/**
 * Credit Status Context value interface
 */
interface CreditStatusContextValue {
  /** Current credit status, null while loading */
  status: CreditStatus | null;
  /** Whether the status is being fetched */
  isLoading: boolean;
  /** Refresh credit status from the server */
  refresh: () => Promise<void>;
  /** Show the upgrade modal with a specific reason */
  showUpgradeModal: (reason: 'credits' | 'messages') => void;
}

const CreditStatusContext = createContext<CreditStatusContextValue | undefined>(
  undefined,
);

/**
 * Credit Status Provider Props
 */
interface CreditStatusProviderProps {
  children: ReactNode;
  /** Initial status from server for SSR hydration */
  initialStatus?: CreditStatus;
}

/**
 * Credit Status Provider Component
 *
 * Provides React context for credit/message status and upgrade modal.
 * Wrap this around authenticated app content.
 *
 * @example
 * ```tsx
 * // In app layout (server component)
 * <CreditStatusProvider initialStatus={initialCreditStatus}>
 *   {children}
 * </CreditStatusProvider>
 * ```
 */
export function CreditStatusProvider({
  children,
  initialStatus,
}: CreditStatusProviderProps) {
  const [status, setStatus] = useState<CreditStatus | null>(
    initialStatus ?? null,
  );
  const [isLoading, setIsLoading] = useState(!initialStatus);
  const [upgradeModalOpen, setUpgradeModalOpen] = useState(false);
  const [upgradeReason, setUpgradeReason] = useState<'credits' | 'messages'>(
    'credits',
  );

  const refresh = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/user/credit-status', {
        credentials: 'include',
      });
      if (response.ok) {
        const data = await response.json();
        setStatus(data);
      } else {
        console.error('Failed to fetch credit status:', response.status);
      }
    } catch (error) {
      console.error('Failed to fetch credit status:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const showUpgradeModal = useCallback((reason: 'credits' | 'messages') => {
    setUpgradeReason(reason);
    setUpgradeModalOpen(true);
  }, []);

  // Fetch on mount if no initial status
  useEffect(() => {
    if (!initialStatus) {
      refresh();
    }
  }, [initialStatus, refresh]);

  return (
    <CreditStatusContext.Provider
      value={{
        status,
        isLoading,
        refresh,
        showUpgradeModal,
      }}
    >
      {children}
      <UpgradeModal
        open={upgradeModalOpen}
        onOpenChange={setUpgradeModalOpen}
        reason={upgradeReason}
      />
    </CreditStatusContext.Provider>
  );
}

/**
 * Hook to access credit status context
 *
 * Must be used within a CreditStatusProvider component.
 *
 * @throws Error if used outside of CreditStatusProvider
 *
 * @example
 * ```tsx
 * function CreditDisplay() {
 *   const { status, isLoading, showUpgradeModal } = useCreditStatus();
 *
 *   if (isLoading || !status) return null;
 *
 *   return (
 *     <div>
 *       Credits: {status.freeCredits}/10
 *       <button onClick={() => showUpgradeModal('credits')}>Upgrade</button>
 *     </div>
 *   );
 * }
 * ```
 */
export function useCreditStatus(): CreditStatusContextValue {
  const context = useContext(CreditStatusContext);
  if (context === undefined) {
    throw new Error(
      'useCreditStatus must be used within a CreditStatusProvider',
    );
  }
  return context;
}
