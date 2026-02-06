'use client';

import { IconCheck, IconSparkles } from '@tabler/icons-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface UpgradeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  reason: 'credits' | 'messages';
}

const YEARLY_LINK = process.env.NEXT_PUBLIC_STRIPE_YEARLY_LINK || '/upgrade';
const LIFETIME_LINK =
  process.env.NEXT_PUBLIC_STRIPE_LIFETIME_LINK || '/upgrade';

export function UpgradeModal({
  open,
  onOpenChange,
  reason,
}: UpgradeModalProps) {
  const title =
    reason === 'credits'
      ? "You've used all your free credits"
      : "You've used all your free chat messages";

  const description =
    reason === 'credits'
      ? "You've used all 10 free credits. Upgrade for unlimited document generation."
      : "You've used all 20 free messages. Upgrade for unlimited chat conversations.";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <IconSparkles className="size-5 text-primary" />
            {title}
          </DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 sm:grid-cols-2">
          {/* Annual Card */}
          <Card className="relative">
            <CardHeader className="pb-2">
              <CardTitle>Annual</CardTitle>
              <CardDescription>Billed yearly</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-baseline">
                <span className="text-3xl font-bold">$45</span>
                <span className="text-muted-foreground">/year</span>
              </div>
              <ul className="space-y-2 text-sm">
                <li className="flex items-center gap-2">
                  <IconCheck className="size-4 text-primary" />
                  Unlimited credits
                </li>
                <li className="flex items-center gap-2">
                  <IconCheck className="size-4 text-primary" />
                  Unlimited chat messages
                </li>
                <li className="flex items-center gap-2">
                  <IconCheck className="size-4 text-primary" />
                  Cancel anytime
                </li>
              </ul>
              <Button asChild className="w-full">
                <a href={YEARLY_LINK}>Get Annual</a>
              </Button>
            </CardContent>
          </Card>

          {/* Lifetime Card */}
          <Card className="relative border-primary">
            <Badge className="absolute -top-3 left-1/2 -translate-x-1/2">
              Best Value
            </Badge>
            <CardHeader className="pb-2">
              <CardTitle>Lifetime</CardTitle>
              <CardDescription>One-time payment</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-baseline">
                <span className="text-3xl font-bold">$99</span>
                <span className="text-muted-foreground"> once</span>
              </div>
              <ul className="space-y-2 text-sm">
                <li className="flex items-center gap-2">
                  <IconCheck className="size-4 text-primary" />
                  Unlimited forever
                </li>
                <li className="flex items-center gap-2">
                  <IconCheck className="size-4 text-primary" />
                  No recurring payments
                </li>
                <li className="flex items-center gap-2">
                  <IconCheck className="size-4 text-primary" />= 2.2 years of
                  annual
                </li>
              </ul>
              <Button asChild className="w-full">
                <a href={LIFETIME_LINK}>Get Lifetime</a>
              </Button>
            </CardContent>
          </Card>
        </div>

        <p className="text-center text-xs text-muted-foreground">
          Secure payment via Stripe. You can dismiss this and continue with
          limited access.
        </p>
      </DialogContent>
    </Dialog>
  );
}
