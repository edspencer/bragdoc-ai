import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { DemoForm } from './demo-form';
import Link from 'next/link';

/**
 * Demo Mode Landing Page
 *
 * Explains the demo mode feature and provides a button to create a demo account.
 * Server component that imports the client DemoForm component.
 *
 * Query params:
 * - empty: if present, creates demo account without pre-populated data (for testing zero states)
 */
export default async function DemoPage({
  searchParams,
}: {
  searchParams: Promise<{ empty?: string }>;
}) {
  const params = await searchParams;
  const isEmpty = params.empty !== undefined;
  return (
    <div className="flex h-dvh w-screen items-start pt-12 md:pt-0 md:items-center justify-center bg-background">
      <Card className="w-full max-w-lg mx-4">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Try Demo Mode</CardTitle>
          <CardDescription className="text-base mt-2">
            Experience BragDoc without signing up
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4 text-sm text-muted-foreground">
            <p>
              When you click the button below, we&apos;ll create a temporary
              demo account for you with:
            </p>
            <ul className="list-disc list-inside space-y-2 ml-2">
              <li>An anonymous email address (demo*****@bragdoc.ai)</li>
              {!isEmpty && (
                <li>
                  Pre-populated sample data including achievements, projects,
                  and documents
                </li>
              )}
              {isEmpty && <li>An empty account (no pre-populated data)</li>}
              <li>Full access to all features</li>
            </ul>
            <p className="text-sm font-medium text-foreground">
              Important: All your demo data will be automatically deleted when
              you log out.
            </p>
          </div>

          <DemoForm empty={isEmpty} />

          <p className="text-center text-sm text-muted-foreground">
            Already have an account?{' '}
            <Link
              href="/login"
              className="font-semibold text-foreground hover:underline"
            >
              Sign in
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
