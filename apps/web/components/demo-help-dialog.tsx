'use client';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { getDemoHelpVideo } from '@/lib/demo-help-videos';

/**
 * Content for the demo help dialog
 */
const DIALOG_CONTENT = {
  title: 'Welcome to Demo Mode',
  description: [
    'This is a demo account with pre-populated achievements to show you how BragDoc works.',
    'The dates have been shifted to recent dates so you can see the application in action.',
    'You have full access to all BragDoc features - feel free to explore!',
    'Your demo data will be deleted when you log out.',
  ],
};

interface DemoHelpDialogProps {
  /**
   * Whether the dialog is open
   */
  open: boolean;

  /**
   * Callback when dialog open state changes
   */
  onOpenChange: (open: boolean) => void;
}

/**
 * Demo Help Dialog Component
 *
 * Displays help for demo mode users with:
 * - Generic welcome message and description
 * - Embedded YouTube tutorial video
 * - "Got it" close button
 *
 * Can be dismissed by clicking outside or pressing Escape.
 * Smooth transitions on open/close.
 *
 * @example
 * ```tsx
 * <DemoHelpDialog
 *   open={isOpen}
 *   onOpenChange={setIsOpen}
 * />
 * ```
 */
export function DemoHelpDialog({ open, onOpenChange }: DemoHelpDialogProps) {
  const video = getDemoHelpVideo();
  const content = DIALOG_CONTENT;

  const handleClose = () => {
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md lg:max-w-2xl">
        {/* Header Section */}
        <DialogHeader className="gap-1">
          <DialogTitle className="text-xl">{content.title}</DialogTitle>
        </DialogHeader>

        {/* Body Section */}
        <div className="space-y-4">
          {/* Description Paragraphs */}
          <div className="space-y-3 text-sm text-muted-foreground">
            {content.description.map((text, index) => (
              <p key={index}>{text}</p>
            ))}
          </div>

          {/* Video Iframe Section */}
          <div className="relative w-full bg-black rounded-lg overflow-hidden">
            {/* 16:9 Aspect Ratio Container */}
            <div className="relative pt-[56.25%]">
              <iframe
                className="absolute inset-0 w-full h-full"
                src={`https://www.youtube.com/embed/${video.youtubeId}`}
                title={video.title}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
          </div>
        </div>

        {/* Footer Section */}
        <DialogFooter className="gap-2 sm:gap-2">
          <Button onClick={handleClose}>Got it</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
