'use client';

import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from 'react';
import type { UIArtifact } from '@/components/artifact';

export const initialArtifactData: UIArtifact = {
  documentId: 'init',
  content: '',
  kind: 'text',
  title: '',
  status: 'idle',
  isVisible: false,
  boundingBox: {
    top: 0,
    left: 0,
    width: 0,
    height: 0,
  },
};

type ArtifactContextType = {
  artifact: UIArtifact;
  setArtifact: (
    updater: UIArtifact | ((current: UIArtifact) => UIArtifact)
  ) => void;
  metadata: any;
  setMetadata: (updater: any) => void;
};

const ArtifactContext = createContext<ArtifactContextType | null>(null);

export function ArtifactProvider({ children }: { children: React.ReactNode }) {
  const [artifact, setArtifactState] =
    useState<UIArtifact>(initialArtifactData);
  const [metadata, setMetadata] = useState<any>(null);

  const setArtifact = useCallback(
    (updater: UIArtifact | ((current: UIArtifact) => UIArtifact)) => {
      setArtifactState((current) => {
        const result =
          typeof updater === 'function' ? updater(current) : updater;
        return result;
      });
    },
    []
  );

  const value = useMemo(
    () => ({
      artifact,
      setArtifact,
      metadata,
      setMetadata,
    }),
    [artifact, setArtifact, metadata]
  );

  return React.createElement(ArtifactContext.Provider, { value }, children);
}

export function useArtifact() {
  const context = useContext(ArtifactContext);
  if (!context) {
    throw new Error('useArtifact must be used within ArtifactProvider');
  }
  return context;
}

type Selector<T> = (state: UIArtifact) => T;

export function useArtifactSelector<Selected>(selector: Selector<Selected>) {
  const { artifact } = useArtifact();
  return useMemo(() => selector(artifact), [artifact, selector]);
}
