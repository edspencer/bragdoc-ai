'use client';

import * as React from 'react';
import { AlertTriangle, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { signOut } from '@/lib/better-auth/client';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

/**
 * DeleteAccountDialog Component
 *
 * A high-consequence confirmation dialog that allows users to permanently delete
 * their account and all associated data.
 *
 * Features:
 * - AlertDialog for high-consequence action
 * - Red/destructive theme throughout
 * - Requires typed confirmation phrase: "delete my data"
 * - Shows list of data that will be deleted
 * - Loading state during deletion
 * - Automatic sign-out and redirect on success
 * - Error handling with toast notifications
 *
 * Usage:
 * ```tsx
 * <DeleteAccountDialog />
 * ```
 */
export function DeleteAccountDialog() {
  const [confirmText, setConfirmText] = React.useState('');
  const [isDeleting, setIsDeleting] = React.useState(false);
  const [isOpen, setIsOpen] = React.useState(false);
  const inputRef = React.useRef<HTMLInputElement>(null);

  // Auto-focus confirmation input when dialog opens
  React.useEffect(() => {
    if (isOpen && inputRef.current) {
      // Use setTimeout to ensure dialog is rendered before focusing
      setTimeout(() => inputRef.current?.focus(), 0);
    }
  }, [isOpen]);

  // Reset confirmation text when dialog closes
  React.useEffect(() => {
    if (!isOpen) {
      setConfirmText('');
    }
  }, [isOpen]);

  // Check if confirmation text matches exactly
  const isConfirmationValid = confirmText === 'delete my data';
  const isDeleteDisabled = !isConfirmationValid || isDeleting;

  const handleDeleteAccount = async () => {
    setIsDeleting(true);

    try {
      // Call the delete account API endpoint
      const response = await fetch('/api/account/delete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      // Handle different response codes
      if (response.status === 401) {
        toast.error('Not authorized. Please sign in again.');
        return;
      }

      if (response.status === 403) {
        toast.error('Cannot delete demo accounts.');
        return;
      }

      if (response.status === 400) {
        const data = await response.json();
        toast.error(
          data.error || 'Invalid request. Account may already be deleted.',
        );
        return;
      }

      if (response.status === 404) {
        toast.error('User not found.');
        return;
      }

      if (!response.ok) {
        toast.error('Failed to delete account. Please try again.');
        return;
      }

      // Success: Account has been deleted
      toast.success('Account successfully deleted.');

      // Close the dialog
      setIsOpen(false);

      // Sign out the user
      await signOut({
        fetchOptions: {
          onSuccess: () => {
            // Redirect to register page
            window.location.href = '/register';
          },
          onError: () => {
            // Even if sign out fails, redirect to register
            window.location.href = '/register';
          },
        },
      });
    } catch (error) {
      console.error('Error deleting account:', error);
      toast.error('An unexpected error occurred. Please try again.');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <AlertDialog open={isOpen} onOpenChange={setIsOpen}>
      <AlertDialogTrigger asChild>
        <Button variant="destructive">Delete Account</Button>
      </AlertDialogTrigger>

      <AlertDialogContent className="sm:max-w-md">
        <AlertDialogHeader>
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 h-5 w-5 flex-shrink-0 text-destructive" />
            <div className="flex-1">
              <AlertDialogTitle>Delete Your Account?</AlertDialogTitle>
              <AlertDialogDescription className="mt-2 space-y-3">
                <p>
                  This action cannot be undone. Deleting your account will
                  permanently remove all of your data and cannot be recovered.
                </p>

                <div>
                  <p className="font-medium text-foreground">
                    The following data will be deleted:
                  </p>
                  <ul className="mt-2 ml-4 list-disc space-y-1 text-sm text-foreground">
                    <li>All achievements and brag documents</li>
                    <li>All projects and companies</li>
                    <li>All documents and reports</li>
                    <li>All chat conversations and AI interactions</li>
                    <li>All login sessions and authentication data</li>
                    <li>Your account information</li>
                  </ul>
                </div>

                <p className="font-semibold text-destructive">
                  To confirm deletion, type the exact phrase below:
                </p>
              </AlertDialogDescription>
            </div>
          </div>
        </AlertDialogHeader>

        <div className="py-2">
          <Input
            ref={inputRef}
            type="text"
            placeholder="delete my data"
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            disabled={isDeleting}
            className={
              confirmText && !isConfirmationValid
                ? 'border-destructive/50 focus-visible:ring-destructive/20'
                : ''
            }
          />
          <p className="mt-2 text-xs text-muted-foreground">
            {isConfirmationValid ? (
              <span className="text-green-600">
                Confirmed - ready to delete
              </span>
            ) : (
              <span>Type the exact phrase to enable deletion</span>
            )}
          </p>
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDeleteAccount}
            disabled={isDeleteDisabled}
            className="bg-destructive text-white hover:bg-destructive/90 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isDeleting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Deleting...
              </>
            ) : (
              'Delete Account'
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
