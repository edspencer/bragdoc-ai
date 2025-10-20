'use client';

import { useState } from 'react';
import { IconPlus } from '@tabler/icons-react';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { createDocumentWithChat } from '@/app/(app)/reports/actions';

interface CreateDocumentDialogProps {
  onDocumentCreated?: (documentId: string) => void;
}

export function CreateDocumentDialog({
  onDocumentCreated,
}: CreateDocumentDialogProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  const handleCreate = async () => {
    if (!title.trim()) {
      toast.error('Please enter a document title');
      return;
    }

    setIsCreating(true);

    try {
      // Create document and chat atomically in a transaction
      const result = await createDocumentWithChat(title.trim());

      if (!result.success) {
        throw new Error(result.error);
      }

      toast.success('Document created successfully');
      setOpen(false);
      setTitle('');

      // Notify parent component to open canvas mode
      if (onDocumentCreated) {
        onDocumentCreated(result.documentId);
      }

      // Refresh the page to show new document
      router.refresh();
    } catch (error) {
      console.error('Error creating document:', error);
      toast.error(
        error instanceof Error ? error.message : 'Failed to create document',
      );
    } finally {
      setIsCreating(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !isCreating) {
      handleCreate();
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <IconPlus className="size-4" />
          New Document
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create New Document</DialogTitle>
          <DialogDescription>
            Create a new document that you can edit with AI assistance in canvas
            mode.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="title">Document Title</Label>
            <Input
              id="title"
              placeholder="e.g., Weekly Report for Manager"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={isCreating}
              autoFocus
            />
          </div>
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => setOpen(false)}
            disabled={isCreating}
          >
            Cancel
          </Button>
          <Button onClick={handleCreate} disabled={isCreating}>
            {isCreating ? 'Creating...' : 'Create & Open'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
