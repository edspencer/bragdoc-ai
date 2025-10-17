'use client';

import { useEffect, useRef } from 'react';
import { initialArtifactData, useArtifact } from '@/hooks/use-artifact';
import { artifactDefinitions } from './artifact';
import { useDataStream } from './data-stream-provider';

export function DataStreamHandler() {
  const { dataStream } = useDataStream();

  const { artifact, setArtifact, setMetadata } = useArtifact();
  const lastProcessedIndex = useRef(-1);
  const artifactKindRef = useRef(artifact.kind);

  // Keep artifact kind in sync via ref to avoid re-running effect
  useEffect(() => {
    artifactKindRef.current = artifact.kind;
  }, [artifact.kind]);

  useEffect(() => {
    if (!dataStream?.length) {
      return;
    }

    const newDeltas = dataStream.slice(lastProcessedIndex.current + 1);
    lastProcessedIndex.current = dataStream.length - 1;

    for (const delta of newDeltas) {
      const artifactDefinition = artifactDefinitions.find(
        (currentArtifactDefinition) =>
          currentArtifactDefinition.kind === artifactKindRef.current,
      );

      if (artifactDefinition?.onStreamPart) {
        artifactDefinition.onStreamPart({
          streamPart: delta,
          setArtifact,
          setMetadata,
        });
      }

      setArtifact((draftArtifact) => {
        // Use fallback instead of initialArtifactData to preserve existing state
        const currentArtifact = draftArtifact || initialArtifactData;

        switch (delta.type) {
          case 'data-id':
            return {
              ...currentArtifact,
              documentId: delta.data,
              status: 'streaming',
            };

          case 'data-title':
            return {
              ...currentArtifact,
              title: delta.data,
              status: 'streaming',
            };

          case 'data-kind':
            return {
              ...currentArtifact,
              kind: delta.data,
              status: 'streaming',
            };

          case 'data-clear':
            return {
              ...currentArtifact,
              content: '',
              status: 'streaming',
            };

          case 'data-finish':
            return {
              ...currentArtifact,
              status: 'idle',
            };

          default:
            return currentArtifact;
        }
      });
    }
  }, [dataStream, setArtifact, setMetadata]);

  return null;
}
