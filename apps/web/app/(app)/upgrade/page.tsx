import { AppPage } from 'components/shared/app-page';
import { SidebarInset } from '@/components/ui/sidebar';
import { SiteHeader } from '@/components/site-header';
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardDescription,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { IconCheck, IconCrown } from '@tabler/icons-react';

/**
 * Upgrade Page
 *
 * Pricing comparison page showing annual vs lifetime subscription options.
 * Links to Stripe Payment Links for checkout.
 */
export default function UpgradePage() {
  return (
    <AppPage
      title="Upgrade"
      description="Choose your plan for unlimited access"
    >
      <SidebarInset>
        <SiteHeader title="Upgrade to Unlimited" />
        <div className="p-6">
          {/* Intro */}
          <div className="mb-8 text-center">
            <h2 className="text-2xl font-bold">Unlock Unlimited AI Power</h2>
            <p className="text-muted-foreground mt-2">
              Generate unlimited documents and chat without limits
            </p>
          </div>

          {/* Pricing cards */}
          <div className="mx-auto max-w-2xl grid gap-6 sm:grid-cols-2">
            {/* Annual Card */}
            <Card>
              <CardHeader>
                <CardTitle>Annual</CardTitle>
                <CardDescription>Billed yearly</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <span className="text-4xl font-bold">$45</span>
                  <span className="text-muted-foreground">/year</span>
                </div>
                <p className="text-sm text-muted-foreground">
                  Just $3.75/month, billed annually
                </p>
                <ul className="space-y-2 text-sm">
                  <li className="flex items-center gap-2">
                    <IconCheck className="size-4 text-green-600" />
                    Unlimited document generation
                  </li>
                  <li className="flex items-center gap-2">
                    <IconCheck className="size-4 text-green-600" />
                    Unlimited chat messages
                  </li>
                  <li className="flex items-center gap-2">
                    <IconCheck className="size-4 text-green-600" />
                    Cancel anytime
                  </li>
                </ul>
                <Button className="w-full" asChild>
                  <a href={process.env.NEXT_PUBLIC_STRIPE_YEARLY_LINK || '#'}>
                    Get Annual Plan
                  </a>
                </Button>
              </CardContent>
            </Card>

            {/* Lifetime Card */}
            <Card className="relative border-primary">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                <Badge className="bg-primary">Best Value</Badge>
              </div>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <IconCrown className="size-4 text-yellow-500" />
                  Lifetime
                </CardTitle>
                <CardDescription>One-time payment</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <span className="text-4xl font-bold">$99</span>
                  <span className="text-muted-foreground"> once</span>
                </div>
                <p className="text-sm text-muted-foreground">
                  Pay once, use forever
                </p>
                <ul className="space-y-2 text-sm">
                  <li className="flex items-center gap-2">
                    <IconCheck className="size-4 text-green-600" />
                    Unlimited forever
                  </li>
                  <li className="flex items-center gap-2">
                    <IconCheck className="size-4 text-green-600" />
                    No recurring payments
                  </li>
                  <li className="flex items-center gap-2">
                    <IconCheck className="size-4 text-green-600" />= 2.2 years
                    of annual
                  </li>
                </ul>
                <Button className="w-full" asChild>
                  <a href={process.env.NEXT_PUBLIC_STRIPE_LIFETIME_LINK || '#'}>
                    Get Lifetime Access
                  </a>
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Trust signals */}
          <div className="mt-8 text-center text-sm text-muted-foreground">
            <p>Secure payment via Stripe. Cancel your annual plan anytime.</p>
          </div>
        </div>
      </SidebarInset>
    </AppPage>
  );
}
