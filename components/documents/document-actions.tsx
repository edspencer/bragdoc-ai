'use client';

import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { MoreHorizontal, Share2, Link2, Trash } from 'lucide-react';
import { useState } from 'react';

interface Document {
  id: string;
  title: string;
  shareToken?: string;
}

interface DocumentActionsProps {
  document: Document;
  onDelete?: () => void;
}

export function DocumentActions({ document, onDelete }: DocumentActionsProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  const handleShare = async () => {
    try {
      setIsLoading(true);
      const response = await fetch(
        `/api/document?id=${document.id}&action=share`,
        {
          method: 'PUT',
        },
      );
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);

      const shareUrl = `${window.location.origin}/shared/${data.shareToken}`;
      await navigator.clipboard.writeText(shareUrl);
      toast.success('Share link copied to clipboard');
    } catch (error) {
      console.error('Error sharing document:', error);
      toast.error('Failed to share document');
    } finally {
      setIsLoading(false);
    }
  };

  const handleUnshare = async () => {
    try {
      setIsLoading(true);
      const response = await fetch(
        `/api/document?id=${document.id}&action=unshare`,
        {
          method: 'PUT',
        },
      );
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error);
      }
      toast.success('Document sharing disabled');
    } catch (error) {
      console.error('Error unsharing document:', error);
      toast.error('Failed to disable sharing');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    try {
      setIsLoading(true);
      const response = await fetch(`/api/document?id=${document.id}`, {
        method: 'DELETE',
      });
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error);
      }
      toast.success('Document deleted');
      onDelete?.();
    } catch (error) {
      console.error('Error deleting document:', error);
      toast.error('Failed to delete document');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className="flex h-8 w-8 p-0"
          disabled={isLoading}
        >
          <MoreHorizontal className="h-4 w-4" />
          <span className="sr-only">Open menu</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem
          onClick={() => router.push(`/documents/${document.id}`)}
        >
          <Link2 className="mr-2 h-4 w-4" />
          View
        </DropdownMenuItem>
        {document.shareToken ? (
          <DropdownMenuItem onClick={handleUnshare}>
            <Share2 className="mr-2 h-4 w-4" />
            Disable Sharing
          </DropdownMenuItem>
        ) : (
          <DropdownMenuItem onClick={handleShare}>
            <Share2 className="mr-2 h-4 w-4" />
            Share
          </DropdownMenuItem>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={handleDelete}
          className="text-destructive"
        >
          <Trash className="mr-2 h-4 w-4" />
          Delete
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
