'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import type { WorksheetFormData, UseWorksheetStorageReturn } from './types';
import { STORAGE_KEY, DEBOUNCE_DELAY, EMPTY_FORM_DATA } from './constants';

/**
 * Safely get a nested value from an object using dot notation path
 */
function _getNestedValue(obj: Record<string, unknown>, path: string): unknown {
  return path.split('.').reduce((acc, key) => {
    if (acc && typeof acc === 'object') {
      return (acc as Record<string, unknown>)[key];
    }
    return undefined;
  }, obj as unknown);
}

/**
 * Safely set a nested value in an object using dot notation path
 * Returns a new object (immutable update)
 */
function setNestedValue(
  obj: WorksheetFormData,
  path: string,
  value: string,
): WorksheetFormData {
  const keys = path.split('.');
  // Deep clone to avoid mutation
  const result = JSON.parse(JSON.stringify(obj)) as WorksheetFormData;

  // Navigate to the nested object and set the value
  let current: any = result;
  for (let i = 0; i < keys.length - 1; i++) {
    current = current[keys[i]];
  }
  current[keys[keys.length - 1]] = value;

  return result;
}

/**
 * Validates that the loaded data matches the expected structure
 */
function isValidFormData(data: unknown): data is WorksheetFormData {
  if (!data || typeof data !== 'object') return false;
  const obj = data as Record<string, unknown>;

  // Check for presence of all top-level sections
  const requiredSections = [
    'codeFeatures',
    'reliabilityDebugging',
    'mentoringKnowledge',
    'architectureDecisions',
    'processImprovements',
    'crossFunctional',
  ];

  return requiredSections.every(
    (section) => section in obj && typeof obj[section] === 'object',
  );
}

/**
 * Custom hook for worksheet localStorage persistence with debounced auto-save.
 *
 * Features:
 * - Loads data from localStorage on mount
 * - Debounces saves by 500ms
 * - Handles localStorage errors gracefully
 * - Tracks last saved timestamp and saving state
 */
export function useWorksheetStorage(): UseWorksheetStorageReturn {
  const [formData, setFormData] = useState<WorksheetFormData>(EMPTY_FORM_DATA);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const pendingDataRef = useRef<WorksheetFormData | null>(null);

  // Load data from localStorage on mount
  useEffect(() => {
    if (typeof window === 'undefined') {
      setIsLoading(false);
      return;
    }

    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (isValidFormData(parsed.data)) {
          setFormData(parsed.data);
          if (parsed.lastSaved) {
            setLastSaved(new Date(parsed.lastSaved));
          }
        }
      }
    } catch (error) {
      console.warn('Failed to load worksheet data from localStorage:', error);
      // Continue with empty form data
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Save to localStorage with debouncing
  const saveToStorage = useCallback((data: WorksheetFormData) => {
    if (typeof window === 'undefined') return;

    try {
      const now = new Date();
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          data,
          lastSaved: now.toISOString(),
        }),
      );
      setLastSaved(now);
      setSaveError(null);
    } catch (error) {
      console.error('Failed to save worksheet data:', error);
      if (error instanceof Error) {
        if (error.name === 'QuotaExceededError') {
          setSaveError(
            'Storage quota exceeded. Please clear some browser data.',
          );
        } else {
          setSaveError('Could not save. Private browsing may be enabled.');
        }
      } else {
        setSaveError('Could not save your progress.');
      }
    } finally {
      setIsSaving(false);
      pendingDataRef.current = null;
    }
  }, []);

  // Update a single field with debounced save
  const updateField = useCallback(
    (fieldPath: string, value: string) => {
      setFormData((prev) => {
        const updated = setNestedValue(prev, fieldPath, value);

        // Set up debounced save
        pendingDataRef.current = updated;
        setIsSaving(true);
        setSaveError(null);

        if (saveTimeoutRef.current) {
          clearTimeout(saveTimeoutRef.current);
        }

        saveTimeoutRef.current = setTimeout(() => {
          if (pendingDataRef.current) {
            saveToStorage(pendingDataRef.current);
          }
        }, DEBOUNCE_DELAY);

        return updated;
      });
    },
    [saveToStorage],
  );

  // Clear all data
  const clearAll = useCallback(() => {
    if (typeof window === 'undefined') return;

    // Cancel any pending saves
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = null;
    }
    pendingDataRef.current = null;

    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch (error) {
      console.warn('Failed to clear localStorage:', error);
    }

    setFormData(EMPTY_FORM_DATA);
    setLastSaved(null);
    setIsSaving(false);
    setSaveError(null);
  }, []);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);

  return {
    formData,
    updateField,
    clearAll,
    lastSaved,
    isLoading,
    isSaving,
    saveError,
  };
}
