import { toast } from 'sonner';
import { Artifact } from '@/components/create-artifact';
import { DocumentSkeleton } from '@/components/document-skeleton';
import {
  CopyIcon,
  PenIcon,
} from '@/components/icons';
import { Editor } from '@/components/text-editor';

// No suggestions metadata for now - deferred
type TextArtifactMetadata = {
  // Empty for now
};

export const textArtifact = new Artifact<'text', TextArtifactMetadata>({
  kind: 'text',
  description: 'Useful for text content, like performance reviews and manager updates.',
  initialize: async ({ documentId, setMetadata }) => {
    // No suggestions to load
    setMetadata({});
  },
  onStreamPart: ({ streamPart, setMetadata, setArtifact }) => {
    // Handle text deltas from streaming
    if (streamPart.type === 'data-textDelta') {
      setArtifact((draftArtifact) => {
        return {
          ...draftArtifact,
          content: draftArtifact.content + streamPart.data,
          isVisible:
            draftArtifact.status === 'streaming' &&
            draftArtifact.content.length > 400 &&
            draftArtifact.content.length < 450
              ? true
              : draftArtifact.isVisible,
          status: 'streaming',
        };
      });
    }
  },
  content: ({
    status,
    content,
    onSaveContent,
    isLoading,
    metadata,
  }) => {
    if (isLoading) {
      return <DocumentSkeleton artifactKind="text" />;
    }

    return (
      <div className="flex flex-row px-4 py-8 md:p-20">
        <Editor
          content={content}
          onSaveContent={onSaveContent}
          status={status}
          suggestions={[]} // No suggestions support
        />
      </div>
    );
  },
  actions: [
    {
      icon: <CopyIcon size={18} />,
      description: 'Copy to clipboard',
      onClick: ({ content }) => {
        navigator.clipboard.writeText(content);
        toast.success('Copied to clipboard!');
      },
    },
  ],
  toolbar: [
    {
      icon: <PenIcon />,
      description: 'Add final polish',
      onClick: ({ sendMessage }) => {
        sendMessage({
          role: 'user',
          parts: [
            {
              type: 'text',
              text: 'Please add final polish and check for grammar, add section titles for better structure, and ensure everything reads smoothly.',
            },
          ],
        });
      },
    },
  ],
});
