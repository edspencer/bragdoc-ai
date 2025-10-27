# Implementation Plan: Magic Link Authentication Migration

## Executive Summary

This plan migrates BragDoc from email/password authentication to passwordless magic link authentication using NextAuth's Email provider. The migration simplifies the authentication architecture by eliminating the dual PostHog identity aliasing code paths (FormData for credentials vs. cookies for OAuth), improves security by removing password storage, and provides a modern authentication experience.

**Key Technical Decisions:**
- Use NextAuth's built-in Email provider with Mailgun SMTP
- Hard cutover migration (recommended) - no dual auth period
- Existing users seamlessly transition to magic links (same user ID, no data loss)
- Single unified PostHog aliasing flow for all authentication methods
- Custom React Email template matching BragDoc branding

**Estimated Complexity:** Medium
- Well-defined NextAuth patterns
- Existing email infrastructure (Mailgun)
- Clear migration path for existing users
- Multiple UI/UX touchpoints to update

**Potential Risks:**
- Email delivery reliability critical for user access
- User adjustment period to passwordless flow
- Must test account linking thoroughly (OAuth + magic link)
- Rollback requires re-adding credentials provider

**Dependencies:**
- Mailgun SMTP credentials (already available)
- NextAuth v5 (already installed: 5.0.0-beta.29)
- React Email infrastructure (already working)
- PostHog analytics (already integrated)

**Assumptions:**
- Mailgun email delivery is reliable (<30 seconds)
- Users are familiar with magic link pattern (Slack, Notion, Linear use it)
- Existing sessions remain valid during migration
- Hard cutover is acceptable (no gradual migration period)

---

## Table of Contents

1. [Phase 1: Create Magic Link Email Template](#phase-1-create-magic-link-email-template)
2. [Phase 2: Configure NextAuth Email Provider](#phase-2-configure-nextauth-email-provider)
3. [Phase 3: Update UI/UX for Magic Links](#phase-3-update-uiux-for-magic-links)
4. [Phase 4: Remove Credentials Provider and Password Logic](#phase-4-remove-credentials-provider-and-password-logic)
5. [Phase 5: Update PostHog Integration](#phase-5-update-posthog-integration-verify-cookie-based-aliasing)
6. [Phase 6: Database Schema Cleanup (Optional)](#phase-6-database-schema-cleanup-optional)
7. [Phase 7: Documentation Updates](#phase-7-documentation-updates)
8. [Phase 8: Testing & Verification](#phase-8-testing--verification)
9. [Phase 9: Deployment Preparation](#phase-9-deployment-preparation)
10. [Phase 10: After-Action Report](#phase-10-after-action-report)

---

## Instructions for Implementation

**For the programmer implementing this plan:**

- **Update as you go:** Mark each task as complete using the checkbox `- [x]` as soon as you finish it
- **Follow phase order:** Complete phases sequentially - each builds on the previous one
- **Test at checkpoints:** Don't skip the "Testing Checkpoint" verifications at the end of each phase
- **Read context carefully:** Each phase includes detailed context about existing code - read it before making changes
- **Preserve existing functionality:** OAuth providers (Google, GitHub) must continue working throughout
- **Ask questions:** If anything is unclear, consult the SPEC.md or ask for clarification
- **Document deviations:** If you deviate from the plan, note why in the LOG.md file

**Important conventions from CLAUDE.md:**
- Use named exports instead of default exports
- Server Components are default - only use `'use client'` when needed
- Never use `redirect()` from `next/navigation` in Server Components (breaks Cloudflare builds)
- Always scope database queries by `userId` for security
- Use the unified `getAuthUser()` helper for all authentication checks

---

## Phase 1: Create Magic Link Email Template

**Purpose:** Build a branded, mobile-responsive magic link email template using React Email that matches BragDoc's design system.

**Acceptance Criteria:**
- Email template created and renders correctly
- Template is mobile-responsive
- Branding matches BragDoc design system
- Clear call-to-action button
- Expiry time clearly stated (24 hours)
- Plain text fallback included

**Tasks:**

### 1.1: Create Magic Link Email Component

**File:** `/Users/ed/Code/brag-ai/apps/web/emails/magic-link.tsx`

Create a new React Email template:

```typescript
import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Html,
  Link,
  Preview,
  Section,
  Text,
} from '@react-email/components';
import * as React from 'react';

interface MagicLinkEmailProps {
  magicLink: string;
  isNewUser?: boolean;
}

export const MagicLinkEmail = ({
  magicLink,
  isNewUser = false,
}: MagicLinkEmailProps) => {
  const previewText = isNewUser
    ? 'Welcome to BragDoc! Click to complete your registration'
    : 'Sign in to your BragDoc account';

  return (
    <Html>
      <Head />
      <Preview>{previewText}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={h1}>
            {isNewUser ? 'Welcome to BragDoc!' : 'Sign in to BragDoc'}
          </Heading>

          <Text style={text}>
            {isNewUser
              ? "We're excited to have you on board! Click the button below to complete your registration and start tracking your professional achievements."
              : "Click the button below to sign in to your account:"}
          </Text>

          <Section style={buttonContainer}>
            <Button style={button} href={magicLink}>
              {isNewUser ? 'Complete Registration' : 'Sign In'}
            </Button>
          </Section>

          <Text style={text}>
            This link will expire in <strong>24 hours</strong> and can only be used once.
          </Text>

          <Text style={text}>
            If you didn't request this email, you can safely ignore it.
          </Text>

          <Text style={footer}>
            BragDoc - Your Professional Achievement Tracker
          </Text>
        </Container>
      </Body>
    </Html>
  );
};

// Styles matching BragDoc branding
const main = {
  backgroundColor: '#ffffff',
  fontFamily:
    '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Oxygen-Sans,Ubuntu,Cantarell,"Helvetica Neue",sans-serif',
};

const container = {
  margin: '0 auto',
  padding: '20px 0 48px',
  width: '580px',
  maxWidth: '100%',
};

const h1 = {
  color: '#1a1a1a',
  fontSize: '24px',
  fontWeight: '600',
  lineHeight: '40px',
  margin: '0 0 20px',
};

const text = {
  color: '#1a1a1a',
  fontSize: '14px',
  lineHeight: '24px',
  margin: '0 0 16px',
};

const buttonContainer = {
  margin: '32px 0',
};

const button = {
  backgroundColor: '#000000',
  borderRadius: '6px',
  color: '#fff',
  fontSize: '16px',
  fontWeight: '600',
  textDecoration: 'none',
  textAlign: 'center' as const,
  display: 'block',
  padding: '12px 20px',
};

const footer = {
  color: '#898989',
  fontSize: '12px',
  lineHeight: '20px',
  margin: '32px 0 0',
};

export default MagicLinkEmail;
```

**Key Design Decisions:**
- Conditional messaging for new vs. existing users
- 24-hour expiry clearly stated
- Single-use clarification
- Mobile-responsive (max-width: 100%)
- Matches welcome email styling

### 1.2: Add Email Rendering Helper

**File:** `/Users/ed/Code/brag-ai/apps/web/lib/email/client.ts`

Add a function to render the magic link email:

```typescript
// Add to existing imports
import { MagicLinkEmail } from '@/emails/magic-link';

// Add after existing email functions
interface SendMagicLinkEmailParams {
  to: string;
  magicLink: string;
  isNewUser?: boolean;
}

export const renderMagicLinkEmail = async (
  props: ComponentProps<typeof MagicLinkEmail>,
): Promise<string> => {
  return render(MagicLinkEmail(props));
};

export const sendMagicLinkEmail = async ({
  to,
  magicLink,
  isNewUser = false,
}: SendMagicLinkEmailParams) => {
  const html = await renderMagicLinkEmail({ magicLink, isNewUser });

  // Note: Magic link emails are transactional, no userId or unsubscribe needed
  return client.messages.create(MAILGUN_DOMAIN, {
    from: FROM_EMAIL,
    to,
    subject: isNewUser ? 'Welcome to BragDoc!' : 'Sign in to BragDoc',
    html,
  });
};
```

**Key Design Decisions:**
- Magic link emails are transactional (no unsubscribe needed)
- No userId parameter (user may not exist yet during signup)
- Subject line differs for new vs. existing users
- Reuses existing Mailgun client

### 1.3: Test Email Template

**Manual Testing Steps:**

- [ ] Start React Email preview server:
```bash
cd /Users/ed/Code/brag-ai/apps/web
pnpm email:dev
```

- [ ] Open browser to http://localhost:3002

- [ ] Verify magic-link template appears in list

- [ ] Test both states:
   - New user (isNewUser=true)
   - Existing user (isNewUser=false)

- [ ] Check mobile responsiveness (Chrome DevTools)

- [ ] Verify all links are clickable

- [ ] Test plain text rendering

**Expected Results:**
- Template renders correctly
- Mobile layout works
- Button is prominent and clickable
- Expiry time is clear
- Branding matches BragDoc

**Testing Checkpoint:** ✅ Email template complete and tested

---

## Phase 2: Configure NextAuth Email Provider

**Purpose:** Add NextAuth's Email provider to the authentication configuration with Mailgun SMTP, enabling magic link authentication alongside existing OAuth providers.

**Acceptance Criteria:**
- Email provider configured in NextAuth
- Mailgun SMTP credentials properly set
- Custom email sending function integrated
- Magic links work for both new and existing users
- Verification token table is used correctly
- No disruption to existing OAuth providers

**Tasks:**

### 2.1: Add Email Provider to NextAuth Config

**File:** `/Users/ed/Code/brag-ai/apps/web/app/(auth)/auth.ts`

Add Email provider to the providers array:

```typescript
// Add to existing imports at top of file
import Email from 'next-auth/providers/email';
import { sendMagicLinkEmail } from '@/lib/email/client';

// In the NextAuth configuration, add to providers array (after GitHub, before Credentials)
export const {
  handlers: { GET, POST },
  auth,
  signIn,
  signOut,
} = NextAuth({
  adapter: DrizzleAdapter(db, {
    usersTable: user,
    accountsTable: account,
    sessionsTable: session,
    verificationTokensTable: verificationToken,
  }),
  session: {
    strategy: 'jwt',
  },
  ...authConfig,
  providers: [
    Google({
      // ... existing Google config
    }),
    GitHub({
      // ... existing GitHub config
    }),
    Email({
      server: {
        host: process.env.MAILGUN_SMTP_SERVER || 'smtp.mailgun.org',
        port: 587,
        auth: {
          user: process.env.MAILGUN_SMTP_LOGIN!,
          pass: process.env.MAILGUN_SMTP_PASSWORD!,
        },
      },
      from: 'hello@bragdoc.ai',
      // Custom email sending function
      sendVerificationRequest: async ({ identifier, url, provider }) => {
        // Check if this is a new user or existing user
        const existingUser = await db
          .select()
          .from(user)
          .where(eq(user.email, identifier))
          .limit(1);

        const isNewUser = existingUser.length === 0;

        try {
          await sendMagicLinkEmail({
            to: identifier,
            magicLink: url,
            isNewUser,
          });
        } catch (error) {
          console.error('Failed to send magic link email:', error);
          throw new Error('Failed to send verification email');
        }
      },
      // Token expiry: 24 hours (default)
      maxAge: 24 * 60 * 60,
    }),
    Credentials({
      // ... keep existing Credentials provider for now (Phase 4 removal)
    }),
  ],
  callbacks: {
    // ... existing callbacks remain unchanged
  },
  events: {
    // ... existing events remain unchanged
  },
});
```

**Key Design Decisions:**
- Email provider placed after OAuth, before Credentials
- Custom `sendVerificationRequest` replaces default SMTP sender
- Checks user existence to personalize email (new vs. existing)
- 24-hour token expiry (NextAuth default)
- Uses existing Mailgun infrastructure
- Error handling prevents silent failures

### 2.2: Add Environment Variables

**File:** `/Users/ed/Code/brag-ai/.env.example`

Add Mailgun SMTP credentials (if not already present):

```bash
# Mailgun SMTP (for magic link emails)
MAILGUN_SMTP_SERVER="smtp.mailgun.org"
MAILGUN_SMTP_LOGIN="postmaster@mg.bragdoc.ai"
MAILGUN_SMTP_PASSWORD="your-smtp-password"
```

**File:** Local `.env` (not committed)

Ensure these variables are set in your local and production environments.

**Verification:**
```bash
# From project root
grep -E "MAILGUN_SMTP" .env
```

### 2.3: Verify Verification Token Table

**File:** `/Users/ed/Code/brag-ai/packages/database/src/schema.ts`

Confirm verification token table exists (already present):

```typescript
export const verificationToken = pgTable(
  'VerificationToken',
  {
    identifier: varchar('identifier', { length: 255 }).notNull(),
    token: varchar('token', { length: 255 }).notNull(),
    expires: timestamp('expires', { mode: 'date' }).notNull(),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.identifier, table.token] }),
  }),
);
```

**Verification:** Table already exists via Drizzle adapter. No migration needed.

### 2.4: Test Magic Link Flow End-to-End

**Testing Steps:**

1. Start dev server:
```bash
cd /Users/ed/Code/brag-ai
pnpm dev:web
```

2. Navigate to http://localhost:3000/register

3. Enter a NEW email address (not previously registered)

4. Click "Sign in with email" (we'll add this button in Phase 3)

5. Check email inbox for magic link

6. Click magic link

7. Verify:
   - Redirected to `/dashboard`
   - User is authenticated
   - New user record created in database
   - PostHog tracking fires (check console)

8. Log out

9. Navigate to http://localhost:3000/login

10. Enter the SAME email address

11. Request magic link again

12. Verify:
    - Email says "Sign in" (not "Welcome")
    - Same user ID (check database)
    - No duplicate user created
    - PostHog shows login event (NOT registration)

**Expected Results:**
- New user flow: Creates account, authenticates, tracks registration
- Existing user flow: Authenticates existing user, tracks login
- OAuth providers still work
- Credentials provider still works (for now)

**Testing Checkpoint:** ✅ Magic link authentication working end-to-end

---

## Phase 3: Update UI/UX for Magic Links

**Purpose:** Update login and registration pages to use magic link authentication, removing password inputs and updating copy to guide users through the passwordless flow.

**Acceptance Criteria:**
- Password input removed from AuthForm
- Registration page updated with magic link flow
- Login page updated with magic link flow
- ToS acceptance still required for new signups
- Clear "Check your email" confirmation state
- Social auth buttons still present and functional
- Loading states during email send
- Error handling for email delivery failures

**Tasks:**

### 3.1: Create Magic Link Auth Form Component

**File:** `/Users/ed/Code/brag-ai/apps/web/components/magic-link-auth-form.tsx`

Create a new form component for magic link authentication:

```typescript
'use client';

import { useState } from 'react';
import Form from 'next/form';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Button } from './ui/button';
import { Mail, Check } from 'lucide-react';

interface MagicLinkAuthFormProps {
  mode: 'login' | 'register';
  tosAccepted?: boolean;
  onTosChange?: (accepted: boolean) => void;
  children?: React.ReactNode;
}

export function MagicLinkAuthForm({
  mode,
  tosAccepted,
  onTosChange,
  children,
}: MagicLinkAuthFormProps) {
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isEmailSent, setIsEmailSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (formData: FormData) => {
    setIsSubmitting(true);
    setError(null);

    const email = formData.get('email') as string;

    try {
      // Use NextAuth signIn with email provider
      const { signIn } = await import('next-auth/react');
      const result = await signIn('email', {
        email,
        redirect: false,
        callbackUrl: '/dashboard',
      });

      if (result?.error) {
        setError('Failed to send magic link. Please try again.');
        setIsSubmitting(false);
      } else {
        setIsEmailSent(true);
        setIsSubmitting(false);
      }
    } catch (err) {
      setError('An unexpected error occurred. Please try again.');
      setIsSubmitting(false);
    }
  };

  if (isEmailSent) {
    return (
      <div className="px-4 sm:px-16 flex flex-col items-center gap-4">
        <div className="w-12 h-12 rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center">
          <Check className="w-6 h-6 text-green-600 dark:text-green-300" />
        </div>
        <div className="text-center space-y-2">
          <h3 className="text-lg font-semibold">Check your email</h3>
          <p className="text-sm text-gray-600 dark:text-zinc-400">
            We've sent a magic link to <strong>{email}</strong>
          </p>
          <p className="text-sm text-gray-500 dark:text-zinc-500">
            Click the link in the email to {mode === 'login' ? 'sign in' : 'complete your registration'}.
          </p>
        </div>
        <Button
          variant="ghost"
          onClick={() => {
            setIsEmailSent(false);
            setEmail('');
          }}
          className="mt-4"
        >
          Use a different email
        </Button>
      </div>
    );
  }

  return (
    <Form action={handleSubmit} className="flex flex-col gap-4 px-4 sm:px-16">
      <div className="flex flex-col gap-2">
        <Label
          htmlFor="email"
          className="text-zinc-600 font-normal dark:text-zinc-400"
        >
          Email Address
        </Label>

        <Input
          id="email"
          name="email"
          className="bg-muted text-md md:text-sm"
          type="email"
          placeholder="user@acme.com"
          autoComplete="email"
          required
          autoFocus
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </div>

      {error && (
        <div className="text-sm text-red-600 dark:text-red-400">
          {error}
        </div>
      )}

      {children}

      <Button type="submit" disabled={isSubmitting} className="w-full">
        {isSubmitting ? (
          <>
            <Mail className="mr-2 h-4 w-4 animate-pulse" />
            Sending magic link...
          </>
        ) : (
          <>
            <Mail className="mr-2 h-4 w-4" />
            {mode === 'login' ? 'Send magic link' : 'Continue with email'}
          </>
        )}
      </Button>
    </Form>
  );
}
```

**Key Design Decisions:**
- Separate component for magic link flow
- Two states: form and "check your email" confirmation
- Loading state during email send
- Error handling with user-friendly messages
- Ability to change email if needed
- Uses NextAuth's `signIn('email')` method
- No password field

### 3.2: Update Registration Page

**File:** `/Users/ed/Code/brag-ai/apps/web/app/(auth)/register/page.tsx`

Replace the entire file:

```typescript
'use client';

import Link from 'next/link';
import { useState } from 'react';
import { MagicLinkAuthForm } from 'components/magic-link-auth-form';
import { SocialAuthButtons } from 'components/social-auth-buttons';

export default function Page() {
  const [tosAccepted, setTosAccepted] = useState(false);

  return (
    <div className="flex h-dvh w-screen items-start pt-12 md:pt-0 md:items-center justify-center bg-background">
      <div className="w-full max-w-md overflow-hidden rounded-2xl gap-12 flex flex-col">
        <div className="flex flex-col items-center justify-center gap-2 px-4 text-center sm:px-16">
          <h3 className="text-xl font-semibold dark:text-zinc-50">
            Create an account
          </h3>
          <p className="text-sm text-gray-500 dark:text-zinc-400">
            Get started for free - no password needed
          </p>
        </div>
        <div className="flex flex-col gap-6">
          <MagicLinkAuthForm mode="register" tosAccepted={tosAccepted}>
            <div className="mb-4">
              <label className="flex items-start gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={tosAccepted}
                  onChange={(e) => setTosAccepted(e.target.checked)}
                  className="mt-1"
                  required
                />
                <span className="text-gray-600 dark:text-zinc-400">
                  I agree to the{' '}
                  <Link
                    href={`${process.env.NEXT_PUBLIC_MARKETING_SITE_HOST || 'https://www.bragdoc.ai'}/terms`}
                    className="text-gray-800 dark:text-zinc-200 underline"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Terms of Service
                  </Link>{' '}
                  and{' '}
                  <Link
                    href={`${process.env.NEXT_PUBLIC_MARKETING_SITE_HOST || 'https://www.bragdoc.ai'}/privacy-policy`}
                    className="text-gray-800 dark:text-zinc-200 underline"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Privacy Policy
                  </Link>
                </span>
              </label>
            </div>
          </MagicLinkAuthForm>
          <div className="px-4 sm:px-16">
            <SocialAuthButtons />
            <p className="text-center text-sm text-gray-600 mt-4 dark:text-zinc-400">
              {'Already have an account? '}
              <Link
                href="/login"
                className="font-semibold text-gray-800 hover:underline dark:text-zinc-200"
              >
                Sign in
              </Link>
              {' instead.'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
```

**Key Changes:**
- Uses `MagicLinkAuthForm` instead of `AuthForm`
- ToS acceptance still required
- Updated copy: "no password needed"
- Removed password-related state management
- Simpler component (no router refresh needed)

### 3.3: Update Login Page

**File:** `/Users/ed/Code/brag-ai/apps/web/app/(auth)/login/page.tsx`

Replace the entire file:

```typescript
'use client';

import Link from 'next/link';
import { MagicLinkAuthForm } from 'components/magic-link-auth-form';
import { SocialAuthButtons } from 'components/social-auth-buttons';
import { DemoModePrompt } from 'components/demo-mode-prompt';

export default function Page() {
  return (
    <div className="flex h-dvh w-screen items-start pt-12 md:pt-0 md:items-center justify-center bg-background">
      <div className="w-full max-w-md overflow-hidden rounded-2xl flex flex-col gap-12">
        <div className="flex flex-col items-center justify-center gap-2 px-4 text-center sm:px-16">
          <h3 className="text-xl font-semibold dark:text-zinc-50">
            Welcome back
          </h3>
          <p className="text-sm text-gray-500 dark:text-zinc-400">
            Sign in to your account - no password needed
          </p>
        </div>
        <div className="flex flex-col gap-6">
          <MagicLinkAuthForm mode="login" />
          <div className="px-4 sm:px-16">
            <SocialAuthButtons />
            <p className="text-center text-sm text-gray-600 mt-4 dark:text-zinc-400">
              {"Don't have an account? "}
              <Link
                href="/register"
                className="font-semibold text-gray-800 hover:underline dark:text-zinc-200"
              >
                Sign up
              </Link>
              {' for free.'}
            </p>
            <DemoModePrompt />
          </div>
        </div>
      </div>
    </div>
  );
}
```

**Key Changes:**
- Uses `MagicLinkAuthForm` instead of `AuthForm`
- Updated copy: "no password needed"
- Removed password-related state management
- Simpler component

### 3.4: Test New UI Flow

**Manual Testing Steps:**

1. Visit http://localhost:3000/register
2. Verify:
   - No password field visible
   - "Continue with email" button present
   - ToS checkbox required
   - Social auth buttons still present
   - Copy mentions "no password needed"

3. Enter email and submit (without ToS)
4. Verify: Form validation prevents submission

5. Check ToS and submit
6. Verify:
   - Loading state shows ("Sending magic link...")
   - Success state shows "Check your email"
   - Email address is displayed
   - "Use a different email" button works

7. Check email inbox
8. Verify:
   - Email received within 30 seconds
   - Email says "Welcome to BragDoc!" (new user)
   - Magic link button is prominent
   - Expiry time stated

9. Click magic link
10. Verify:
    - Redirected to /dashboard
    - User is authenticated
    - Session created

11. Log out

12. Visit http://localhost:3000/login
13. Enter SAME email
14. Verify:
    - Magic link sent
    - Email says "Sign in to BragDoc" (existing user)
    - Link works
    - Same user account (check database)

**Expected Results:**
- Registration flow works for new users
- Login flow works for existing users
- Email delivery is reliable
- UI is clear and intuitive
- OAuth still works
- No password fields anywhere

**Testing Checkpoint:** ✅ UI updated and magic link flow working

---

## Phase 4: Remove Credentials Provider and Password Logic

**Purpose:** Remove the email/password authentication provider and all related code, simplifying the authentication architecture to use only magic links and OAuth.

**Acceptance Criteria:**
- Credentials provider removed from NextAuth config
- `register()` server action deleted
- `login()` server action deleted (or simplified to only redirect)
- `AuthForm` component removed
- bcrypt-ts dependency removed
- Password-related database queries removed
- No broken references to password authentication

**Tasks:**

### 4.1: Remove Credentials Provider

**File:** `/Users/ed/Code/brag-ai/apps/web/app/(auth)/auth.ts`

Remove the Credentials provider from the providers array:

```typescript
// Remove this entire provider block:
// Credentials({
//   credentials: {},
//   async authorize({ email, password }: any) {
//     const users = await getUser(email);
//     if (users.length === 0) return null;
//     const passwordsMatch = await compare(password, users[0]!.password!);
//     if (!passwordsMatch) return null;
//     return {
//       ...users[0],
//       provider: 'credentials',
//     } as any;
//   },
// }),
```

After removal, the providers array should contain only:
- Google
- GitHub
- Email

**Also remove bcrypt import at top:**
```typescript
// Remove this line:
// import { compare } from 'bcrypt-ts';
```

### 4.2: Delete Server Actions

**File:** `/Users/ed/Code/brag-ai/apps/web/app/(auth)/actions.ts`

Delete the entire file. This file contains:
- `register()` server action (creates user with password)
- `login()` server action (validates password)
- PostHog FormData aliasing logic (no longer needed)

**Rationale:** Magic links use NextAuth's built-in flow via `signIn('email')`, so custom server actions are unnecessary. PostHog aliasing now happens uniformly in the `createUser` event (already present).

### 4.3: Remove AuthForm Component

**File:** `/Users/ed/Code/brag-ai/apps/web/components/auth-form.tsx`

Delete the entire file. This component has password fields and is no longer used (replaced by `MagicLinkAuthForm`).

**Verify no other files import AuthForm:**
```bash
cd /Users/ed/Code/brag-ai
grep -r "from.*auth-form" apps/web/
```

Expected result: No matches (login/register pages already updated in Phase 3)

### 4.4: Remove Password-Related Database Queries

**File:** `/Users/ed/Code/brag-ai/packages/database/src/queries.ts`

Find and update the `createUser` function to remove password handling:

**Before:**
```typescript
export async function createUser(email: string, password: string) {
  const hashedPassword = await hash(password, 10);
  const [newUser] = await db
    .insert(user)
    .values({
      email,
      password: hashedPassword,
      preferences: {
        language: 'en',
        documentInstructions: '',
      },
    })
    .returning();
  return newUser!;
}
```

**After:**
```typescript
// Function no longer needed - NextAuth Email provider creates users automatically
// If you need to create users programmatically for other reasons, use:
export async function createUser(email: string) {
  const [newUser] = await db
    .insert(user)
    .values({
      email,
      preferences: {
        language: 'en',
        documentInstructions: '',
      },
    })
    .returning();
  return newUser!;
}
```

**Note:** The NextAuth Email provider with Drizzle adapter will automatically create users when they click magic links, so this function may not be needed at all. Consider removing it entirely if it's not used elsewhere.

**Verify usage:**
```bash
cd /Users/ed/Code/brag-ai
grep -r "createUser" apps/web/
```

If only used in `actions.ts` (which we deleted), remove the function entirely.

**Also remove bcrypt import from queries.ts if present:**
```typescript
// Remove if exists:
// import { hash } from 'bcrypt-ts';
```

### 4.5: Remove bcrypt-ts Dependency

**File:** `/Users/ed/Code/brag-ai/package.json` (root)

Remove the bcrypt-ts dependency:

```json
// Remove this line from dependencies:
// "bcrypt-ts": "^5.0.3",
```

**Run cleanup:**
```bash
cd /Users/ed/Code/brag-ai
pnpm install
```

This removes unused bcrypt-ts from node_modules.

### 4.6: Verify No Broken References

**Search for remaining password references:**

```bash
cd /Users/ed/Code/brag-ai/apps/web

# Check for password-related code
grep -r "password" app/ components/ lib/ --include="*.ts" --include="*.tsx" | grep -v "node_modules" | grep -v ".next"

# Check for bcrypt imports
grep -r "bcrypt" . --include="*.ts" --include="*.tsx" | grep -v "node_modules" | grep -v ".next"

# Check for references to deleted actions
grep -r "from.*actions" app/ --include="*.tsx" | grep -v "node_modules"
```

**Expected results:**
- Some password references in comments/types (acceptable)
- No bcrypt imports
- No imports from `app/(auth)/actions`

**Fix any found issues before proceeding.**

### 4.7: Test Authentication Still Works

**Testing Steps:**

1. Start dev server:
```bash
cd /Users/ed/Code/brag-ai
pnpm dev:web
```

2. Test magic link signup:
   - Visit /register
   - Enter NEW email
   - Accept ToS
   - Send magic link
   - Click link in email
   - Verify: Logged in successfully

3. Test magic link login:
   - Log out
   - Visit /login
   - Enter SAME email
   - Send magic link
   - Click link in email
   - Verify: Logged in successfully

4. Test Google OAuth:
   - Log out
   - Click "Sign in with Google"
   - Complete OAuth flow
   - Verify: Logged in successfully

5. Test GitHub OAuth:
   - Log out
   - Click "Sign in with GitHub"
   - Complete OAuth flow
   - Verify: Logged in successfully

6. Check PostHog:
   - New signup via magic link → `user_registered` event
   - Login via magic link → `user_logged_in` event
   - OAuth signup → `user_registered` event
   - OAuth login → `user_logged_in` event

**Expected Results:**
- All authentication methods work
- No password options visible
- No errors in browser console
- PostHog events fire correctly
- Users can access dashboard

**Testing Checkpoint:** ✅ Credentials provider removed, all auth still works

---

## Phase 5: Update PostHog Integration (Verify Cookie-Based Aliasing)

**Purpose:** Verify that PostHog identity aliasing works correctly with the unified cookie-based approach for all authentication providers (magic link, Google, GitHub).

**Acceptance Criteria:**
- PostHog aliasing works for magic link signups
- PostHog aliasing works for OAuth signups
- Anonymous events are correctly merged with user identity
- No duplicate user identities created
- FormData-based aliasing code is removed (already done in Phase 4)

**Tasks:**

### 5.1: Verify Unified Aliasing in NextAuth Config

**File:** `/Users/ed/Code/brag-ai/apps/web/app/(auth)/auth.ts`

The `createUser` event already handles PostHog aliasing via cookies for OAuth providers. Verify this works for Email provider too:

**Current code (should already be present):**
```typescript
events: {
  createUser({ user }) {
    const { email } = user;

    if (email && user.id) {
      console.log(`Sending welcome email to ${email}`);

      // Track user registration (OAuth providers)
      try {
        captureServerEvent(user.id, 'user_registered', {
          method: user.provider || 'unknown',
          email: email,
          user_id: user.id,
        });

        // Identify user in PostHog
        identifyUser(user.id, {
          email: email,
          name: user.name || email.split('@')[0],
        });
      } catch (error) {
        console.error('Failed to track registration event:', error);
      }

      // Welcome email sending logic...
    }
  },
  // ... existing signIn and signOut events
}
```

**Issue:** The current code doesn't alias anonymous IDs. We need to add cookie-based aliasing.

**Updated `createUser` event:**
```typescript
import { cookies } from 'next/headers';
import { aliasUser } from '@/lib/posthog-server';

// ... in events.createUser:
async createUser({ user }) {
  const { email } = user;

  if (email && user.id) {
    console.log(`New user created: ${email}`);

    // Track user registration
    try {
      await captureServerEvent(user.id, 'user_registered', {
        method: user.provider || 'email',
        email: email,
        user_id: user.id,
      });

      // Identify user in PostHog
      await identifyUser(user.id, {
        email: email,
        name: user.name || email.split('@')[0],
      });

      // Alias anonymous ID (unified for all providers)
      const cookieStore = await cookies();
      const anonymousId = cookieStore.get('ph_anonymous_id')?.value;
      if (anonymousId && anonymousId !== user.id) {
        await aliasUser(user.id, anonymousId);
        cookieStore.delete('ph_anonymous_id');
      }
    } catch (error) {
      console.error('Failed to track registration:', error);
    }

    // Send welcome email
    try {
      await sendWelcomeEmail({
        to: email,
        userId: user.id,
        username: email.split('@')[0]!,
        loginUrl: `${process.env.NEXTAUTH_URL}/login`,
      });
    } catch (error) {
      console.error('Failed to send welcome email:', error);
    }
  }
}
```

**Key Changes:**
- Added `aliasUser` call to merge anonymous events
- Works for all providers (Email, Google, GitHub)
- Deletes anonymous ID cookie after aliasing
- Changed method from 'unknown' to 'email' for Email provider

### 5.2: Add Missing PostHog Functions

**File:** `/Users/ed/Code/brag-ai/apps/web/lib/posthog-server.ts`

Add the `aliasUser` function if not already present:

```typescript
/**
 * Alias an anonymous user ID to a known user ID
 * This merges all events from the anonymous session with the authenticated user
 */
export async function aliasUser(userId: string, anonymousId: string) {
  try {
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://app.posthog.com'}/capture/`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          api_key: process.env.NEXT_PUBLIC_POSTHOG_KEY,
          event: '$create_alias',
          properties: {
            distinct_id: userId,
            alias: anonymousId,
          },
          timestamp: new Date().toISOString(),
        }),
      },
    );

    if (!response.ok) {
      console.error('PostHog alias failed:', await response.text());
    }
  } catch (error) {
    console.error('PostHog alias failed:', error);
  }
}
```

**Verify this function doesn't already exist:**
```bash
grep -n "aliasUser" /Users/ed/Code/brag-ai/apps/web/lib/posthog-server.ts
```

If it exists, ensure the implementation matches above.

### 5.3: Test PostHog Aliasing

**Testing Steps:**

1. Open PostHog dashboard (https://app.posthog.com)

2. Clear browser cookies/localStorage

3. Visit BragDoc homepage (marketing site or app)

4. Perform some actions as anonymous user:
   - View homepage
   - Click features
   - Navigate to /register

5. Note the anonymous ID from browser DevTools:
   - Application tab → Cookies → `ph_anonymous_id`
   - Copy the value

6. Complete registration via magic link:
   - Enter email
   - Accept ToS
   - Click "Continue with email"
   - Check email
   - Click magic link

7. After authentication:
   - Check PostHog live events
   - Find the `$create_alias` event
   - Verify it links the anonymous ID to user ID

8. Check user's event stream in PostHog:
   - Should show events BEFORE registration (anonymous)
   - Should show events AFTER registration (authenticated)
   - All should be under the same user identity

**Expected Results:**
- Anonymous events are visible in user's stream
- `$create_alias` event fired
- No duplicate user identities
- Registration event shows correct method ('email')

### 5.4: Test OAuth Aliasing

**Testing Steps:**

1. Clear cookies again

2. Perform anonymous actions

3. Sign up with Google OAuth

4. Verify:
   - `$create_alias` event fired
   - Anonymous events merged with user
   - Registration event shows method 'google'

5. Repeat with GitHub OAuth

**Expected Results:**
- OAuth aliasing works identically to magic link
- Single code path for all providers
- No broken aliasing

**Testing Checkpoint:** ✅ PostHog aliasing unified and working for all providers

---

## Phase 6: Database Schema Cleanup (Optional)

**Purpose:** Remove the `password` column from the User table since passwords are no longer stored or used. This is optional and can be deferred if a rollback buffer is desired.

**Acceptance Criteria:**
- Database migration created to remove password column
- Migration tested in development
- All auth methods still work after migration
- Migration is reversible if needed
- Schema documented

**Tasks:**

### 6.1: Create Database Migration

**Generate migration:**
```bash
cd /Users/ed/Code/brag-ai/packages/database
pnpm db:generate
```

This will detect the schema change (password column removal) and generate a migration.

**File:** `/Users/ed/Code/brag-ai/packages/database/src/schema.ts`

Update the user table schema to remove password:

```typescript
export const user = pgTable('User', {
  id: uuid('id').primaryKey().notNull().defaultRandom(),
  email: varchar('email', { length: 64 }).notNull(),
  // Remove this line:
  // password: varchar('password', { length: 64 }),
  name: varchar('name', { length: 256 }),
  image: varchar('image', { length: 512 }),
  provider: varchar('provider', { length: 32 })
    .notNull()
    .default('credentials'), // Keep default for backward compatibility
  providerId: varchar('provider_id', { length: 256 }),
  githubAccessToken: varchar('github_access_token', { length: 256 }),
  preferences: jsonb('preferences').$type<UserPreferences>().notNull().default({
    language: 'en',
    documentInstructions: '',
  }),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
  emailVerified: timestamp('email_verified').defaultNow(),
  level: userLevelEnum('level').notNull().default('free'),
  renewalPeriod: renewalPeriodEnum('renewal_period')
    .notNull()
    .default('monthly'),
  lastPayment: timestamp('last_payment'),
  status: userStatusEnum('status').notNull().default('active'),
  stripeCustomerId: varchar('stripe_customer_id', { length: 256 }),
  tosAcceptedAt: timestamp('tos_accepted_at'),
});
```

**Run migration generator:**
```bash
pnpm db:generate
```

**Expected output:** New migration file created in `packages/database/src/migrations/`

Example: `0024_remove_user_password.sql`

### 6.2: Review Generated Migration

**File:** `packages/database/src/migrations/00XX_remove_user_password.sql`

The migration should contain:

```sql
-- Remove password column from User table
ALTER TABLE "User" DROP COLUMN IF EXISTS "password";
```

**Verify the migration looks correct.** If Drizzle generates additional changes, review carefully to ensure only the password column is affected.

### 6.3: Test Migration in Development

**Backup database first:**
```bash
# Using pg_dump (if PostgreSQL)
pg_dump $DATABASE_URL > backup-before-password-removal.sql
```

**Apply migration:**
```bash
cd /Users/ed/Code/brag-ai/packages/database
pnpm db:push
```

**Verify migration applied:**
```bash
# Connect to database and check schema
psql $DATABASE_URL -c "\d \"User\""
```

**Expected result:** No `password` column in the User table.

### 6.4: Test All Auth Methods After Migration

**Testing Steps:**

1. Magic link signup (new user)
2. Magic link login (existing user)
3. Google OAuth signup
4. Google OAuth login
5. GitHub OAuth signup
6. GitHub OAuth login

**Expected Results:**
- All methods work
- No errors related to missing password column
- User records created without password field

**If tests fail:** Rollback migration and investigate.

### 6.5: Create Rollback Migration (Optional)

**File:** `packages/database/src/migrations/00XX_rollback_add_password.sql`

Create a manual rollback migration:

```sql
-- Rollback: Add password column back (for emergency use)
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "password" VARCHAR(64);
```

**Do not apply this.** Keep it for emergency rollback only.

### 6.6: Document Schema Change

**File:** `/Users/ed/Code/brag-ai/packages/database/README.md` (or create if doesn't exist)

Add note about password column removal:

```markdown
## Schema History

### 2025-01-XX: Removed Password Column

- Removed `password` column from `User` table
- Migration: `00XX_remove_user_password.sql`
- Reason: Migrated to passwordless magic link authentication
- Impact: Existing password hashes no longer accessible (users must use magic links)
- Rollback: `00XX_rollback_add_password.sql` (adds column back, but data is lost)
```

**Testing Checkpoint:** ✅ Database schema cleaned up, all auth still works

**Note:** This phase is OPTIONAL. You can defer it for 30 days to maintain a rollback buffer. If you skip this phase, existing password hashes remain in the database (unused but harmless).

---

## Phase 7: Documentation Updates

**Purpose:** Update technical and user-facing documentation to reflect the magic link authentication system.

**IMPORTANT:** According to `.claude/docs/processes/plan-requirements.md`, planners should consult the documentation-manager agent during plan creation to identify which documentation needs updates. For future iterations of this plan, the documentation-manager should be consulted to ensure all relevant documentation is identified.

**Acceptance Criteria:**
- Technical documentation updated
- User-facing documentation updated (if exists)
- CLAUDE.md reflects new auth patterns
- API documentation updated
- CLI authentication docs remain accurate

**Tasks:**

### 7.1: Update CLAUDE.md

**File:** `/Users/ed/Code/brag-ai/CLAUDE.md`

Update the Authentication section:

**Find and replace:**

**Old text:**
```markdown
### Authentication

**Location**: `apps/web/app/(auth)/auth.ts`

#### Providers

- **Google OAuth**
- **GitHub OAuth**
- **Credentials** (email/password with bcrypt)
```

**New text:**
```markdown
### Authentication

**Location**: `apps/web/app/(auth)/auth.ts`

#### Providers

- **Magic Links** (passwordless email authentication via NextAuth Email provider)
- **Google OAuth**
- **GitHub OAuth**
```

**Update the CLI Authentication Flow section:**

Keep the existing CLI auth flow documentation (it uses JWT tokens via `/api/cli/token` and is unaffected by this change).

**Update the Unified Auth Helper section:**

No changes needed - `getAuthUser` still works the same way (checks session first, then JWT).

### 7.2: CLAUDE.md Updates Analysis

**Purpose:** Comprehensive review of CLAUDE.md to identify all sections that need updates based on this migration.

**Analysis:**

The following sections of CLAUDE.md require updates:

1. **Authentication Section (lines ~487-508)**
   - ✅ **Requires update:** Change from "Credentials (email/password with bcrypt)" to "Magic Links (passwordless email)"
   - ✅ **Requires update:** Update provider list and description

2. **CLI Authentication Flow (lines ~509-520)**
   - ✅ **No changes needed:** CLI auth uses JWT tokens via `/api/cli/token`, unaffected by this change

3. **Unified Auth Helper (lines ~521-542)**
   - ✅ **No changes needed:** `getAuthUser` implementation unchanged

4. **Component Patterns Section**
   - ✅ **Requires addition:** Add pattern for magic link form component (MagicLinkAuthForm)
   - ✅ **Requires update:** Remove references to password-based AuthForm component

5. **Server Actions Section**
   - ✅ **Requires update:** Note removal of `register()` and `login()` server actions
   - ✅ **Add note:** Magic links use NextAuth's built-in `signIn('email')` method

6. **Testing Section**
   - ✅ **Optional update:** Add note about testing magic link flows

**Tasks:**
- [ ] Update Authentication providers list (Section: Authentication)
- [ ] Add MagicLinkAuthForm pattern documentation (Section: Component Patterns)
- [ ] Remove password-based server action references (Section: Server Actions)
- [ ] Add note about NextAuth Email provider patterns (Section: Authentication)

### 7.3: Update Technical Documentation

**File:** `/Users/ed/Code/brag-ai/.claude/docs/tech/authentication.md`

Update the entire authentication documentation:

**Find these sections and update:**

**Authentication Methods:**
```markdown
## Authentication Methods

BragDoc supports three authentication methods:

1. **Magic Links** - Passwordless email authentication (primary method)
2. **Google OAuth** - Sign in with Google account
3. **GitHub OAuth** - Sign in with GitHub account

All methods use NextAuth.js v5 with JWT strategy.
```

**Magic Link Flow:**
```markdown
### Magic Link Authentication

**Flow:**
1. User enters email address
2. NextAuth generates unique token (24-hour expiry)
3. Custom email sent via Mailgun with magic link
4. User clicks link
5. NextAuth validates token
6. If valid:
   - New user: Creates account, sends welcome email
   - Existing user: Logs in to existing account
7. Session created via JWT

**Token Management:**
- Tokens stored in `VerificationToken` table (via Drizzle adapter)
- Single-use tokens (deleted after use)
- 24-hour expiration
- Email as identifier (can send new token to same email)

**Email Customization:**
- Template: `apps/web/emails/magic-link.tsx`
- Personalized for new vs. existing users
- Sent via Mailgun SMTP
- Mobile-responsive React Email template
```

**Remove Credentials Provider Section:**
```markdown
### ~~Credentials Provider~~ (Removed)

Previously, BragDoc supported email/password authentication. This was removed in favor of passwordless magic links to:
- Improve security (no passwords to leak)
- Simplify architecture (unified auth flow)
- Better user experience (no forgotten passwords)
- Reduce code complexity
```

**Update PostHog Integration Section:**
```markdown
## PostHog Integration

All authentication providers use a unified cookie-based PostHog aliasing flow:

**Flow:**
1. Anonymous user browses site → PostHog sets `ph_anonymous_id` cookie
2. User signs up via ANY provider (magic link, Google, GitHub)
3. NextAuth `createUser` event fires
4. Server reads `ph_anonymous_id` cookie
5. Server calls `aliasUser(userId, anonymousId)`
6. PostHog merges anonymous events with user identity
7. Server deletes `ph_anonymous_id` cookie

**Implementation:**
- Location: `apps/web/app/(auth)/auth.ts` - `events.createUser`
- Single code path for all providers
- No provider-specific aliasing logic
```

### 7.4: Update API Documentation

**File:** `/Users/ed/Code/brag-ai/.claude/docs/tech/api-conventions.md`

Verify the authentication section is still accurate. No changes should be needed (API authentication uses `getAuthUser` which supports both session and JWT, unchanged).

### 7.5: Update Frontend Patterns Documentation

**File:** `/Users/ed/Code/brag-ai/.claude/docs/tech/frontend-patterns.md`

Add a section about the magic link form pattern:

```markdown
## Magic Link Authentication Pattern

BragDoc uses a custom magic link authentication form with two states:

### Form State

```typescript
<MagicLinkAuthForm mode="login" | "register">
  {/* Optional: ToS checkbox for registration */}
</MagicLinkAuthForm>
```

### Confirmation State

After submitting email, the form displays a "Check your email" confirmation with:
- Success icon
- Email address confirmation
- Instructions to click the link
- "Use a different email" option to restart

### Implementation Details

- Uses NextAuth's `signIn('email')` method
- Loading states during email send
- Error handling for delivery failures
- No password fields
- Mobile-responsive
```

### 7.6: Update User-Facing Documentation (If Exists)

**Check for user documentation:**
```bash
find /Users/ed/Code/brag-ai -name "*.md" -path "*/docs/*" | grep -i "auth\|login\|sign"
```

**If user-facing documentation exists, update references to:**
- Remove password-related instructions
- Add magic link instructions
- Update screenshots (if any)
- Clarify that passwords are not used

### 7.7: Update README Files

**File:** `/Users/ed/Code/brag-ai/README.md` (if it mentions authentication)

Update any authentication descriptions:

**Example update:**
```markdown
### Authentication

BragDoc uses passwordless authentication:
- **Magic Links**: Sign in via email (no password needed)
- **OAuth**: Sign in with Google or GitHub

All authentication is handled by NextAuth.js v5 with JWT strategy.
```

**File:** `/Users/ed/Code/brag-ai/apps/web/README.md` (if exists)

Similar updates for web app specific documentation.

**Testing Checkpoint:** ✅ All documentation updated

---

## Phase 8: Testing & Verification

**Purpose:** Comprehensive testing of the entire magic link authentication system, including edge cases, account linking, and PostHog tracking.

**Acceptance Criteria:**
- New user signup works via magic link
- Existing user login works via magic link
- OAuth providers still work (Google, GitHub)
- Account linking works (magic link → OAuth, OAuth → magic link)
- PostHog aliasing works for all methods
- Error cases are handled gracefully
- Email delivery is reliable
- Mobile experience is good
- No security vulnerabilities

**Tasks:**

### 8.1: Functional Testing

**Test Case 1: New User Signup (Magic Link)**

Steps:
1. Clear all cookies/localStorage
2. Visit /register
3. Enter new email: `testuser+magic1@example.com`
4. Accept ToS
5. Click "Continue with email"
6. Check email inbox
7. Click magic link
8. Verify: Redirected to /dashboard, authenticated

Expected Results:
- Email received within 30 seconds
- Email subject: "Welcome to BragDoc!"
- Magic link works
- User created in database
- Welcome email sent
- PostHog events: `user_registered`, `$identify`, `$create_alias`

**Test Case 2: Existing User Login (Magic Link)**

Steps:
1. Use the same email from Test Case 1
2. Log out
3. Visit /login
4. Enter same email: `testuser+magic1@example.com`
5. Click "Send magic link"
6. Check email inbox
7. Click magic link
8. Verify: Redirected to /dashboard, authenticated

Expected Results:
- Email subject: "Sign in to BragDoc"
- Email says "Sign in" (not "Welcome")
- Same user ID (check database)
- No new user created
- PostHog event: `user_logged_in` (NOT `user_registered`)

**Test Case 3: Google OAuth Signup**

Steps:
1. Clear cookies
2. Visit /register
3. Click "Sign in with Google"
4. Complete OAuth flow
5. Verify: Redirected to /dashboard, authenticated

Expected Results:
- User created in database
- Provider: 'google'
- Welcome email sent
- PostHog: `user_registered`, `$create_alias`

**Test Case 4: GitHub OAuth Login**

Steps:
1. Use existing GitHub account (or create new)
2. Log out
3. Visit /login
4. Click "Sign in with GitHub"
5. Complete OAuth flow
6. Verify: Logged in

Expected Results:
- Same user if already registered, new user if not
- PostHog: `user_logged_in` or `user_registered`

**Test Case 5: Account Linking (Magic Link → Google)**

Steps:
1. Create account with magic link: `testuser+linking1@gmail.com`
2. Create some achievements
3. Log out
4. Visit /login
5. Click "Sign in with Google"
6. Use Google account with SAME email: `testuser+linking1@gmail.com`
7. Complete OAuth flow
8. Verify: Same user ID, all achievements still there

Expected Results:
- NextAuth links accounts automatically
- Same user.id
- Account table has two entries (email + google) with same userId
- PostHog: `user_logged_in` (not new user)

**Test Case 6: Account Linking (GitHub → Magic Link)**

Steps:
1. Create account with GitHub: user@example.com
2. Create some achievements
3. Log out
4. Visit /login
5. Enter SAME email: user@example.com
6. Send magic link
7. Click magic link
8. Verify: Same user ID, all achievements still there

Expected Results:
- Accounts linked
- Same user.id
- Account table has two entries (github + email) with same userId
- PostHog identity unchanged

### 8.2: Edge Case Testing

**Test Case 7: Expired Token**

Steps:
1. Request magic link
2. Wait 25 hours (or manually set token expiry in database)
3. Click magic link
4. Verify: Error message displayed

Expected Results:
- NextAuth shows error: "Token expired"
- User can request new magic link
- Clear instructions to try again

**Test Case 8: Token Already Used**

Steps:
1. Request magic link
2. Click link (successfully logs in)
3. Copy the magic link URL
4. Log out
5. Visit the same magic link URL again
6. Verify: Error message

Expected Results:
- NextAuth shows error: "Token already used"
- User can request new magic link

**Test Case 9: Email Delivery Failure**

Steps:
1. Temporarily break Mailgun credentials (wrong password)
2. Request magic link
3. Verify: Error message displayed

Expected Results:
- Form shows error: "Failed to send magic link. Please try again."
- User remains on form
- Can retry

**Test Case 10: Invalid Email Format**

Steps:
1. Enter invalid email: "notanemail"
2. Click submit
3. Verify: HTML5 validation prevents submission

Expected Results:
- Browser validation: "Please enter a valid email"
- Form does not submit

**Test Case 11: ToS Not Accepted (Registration)**

Steps:
1. Enter email
2. Do NOT check ToS checkbox
3. Click submit
4. Verify: Form validation prevents submission

Expected Results:
- HTML5 required attribute prevents submission
- Browser shows: "Please check this box if you want to proceed"

**Test Case 12: Multiple Magic Links Requested**

Steps:
1. Request magic link
2. Immediately request another magic link (same email)
3. Verify: Both links arrive

Expected Results:
- Both emails delivered
- Only the most recent link works (first one is invalid)
- No errors

**Test Case 13: Different Email Formats**

Test with various email formats:
- Gmail: user@gmail.com
- Outlook: user@outlook.com
- Yahoo: user@yahoo.com
- Corporate: user@company.com
- Plus addressing: user+test@gmail.com

Expected Results:
- All formats work
- Emails delivered to all providers
- Links function correctly

### 8.3: PostHog Tracking Verification

**Test Case 14: Anonymous → Authenticated (Magic Link)**

Steps:
1. Clear cookies
2. Visit homepage (anonymous browsing)
3. Check DevTools: Note `ph_anonymous_id` cookie value
4. Click some navigation links (generate anonymous events)
5. Sign up with magic link
6. Check PostHog dashboard

Expected Results:
- Anonymous events visible in PostHog
- `$create_alias` event fired
- All anonymous events now attributed to user ID
- No duplicate identity

**Test Case 15: Anonymous → Authenticated (OAuth)**

Steps:
1. Clear cookies
2. Generate anonymous events
3. Sign up with Google OAuth
4. Check PostHog

Expected Results:
- Same as Test Case 14
- Aliasing works identically

**Test Case 16: Direct Login (No Anonymous Events)**

Steps:
1. Clear cookies
2. Go directly to /login (no browsing)
3. Log in with magic link
4. Check PostHog

Expected Results:
- No anonymous ID to alias
- `user_logged_in` event fires
- No `$create_alias` event (expected - no anonymous ID)
- No errors

### 8.4: Security Testing

**Test Case 17: SQL Injection Attempt**

Steps:
1. Enter email: `'; DROP TABLE "User"; --`
2. Submit form
3. Verify: No SQL injection

Expected Results:
- Treated as literal email (invalid format)
- NextAuth/Drizzle ORM prevents injection
- No database damage

**Test Case 18: XSS Attempt**

Steps:
1. Enter email: `<script>alert('xss')</script>@example.com`
2. Submit form
3. Verify: No XSS execution

Expected Results:
- Treated as literal email
- No script execution in browser
- No XSS vulnerability

**Test Case 19: Token Manipulation**

Steps:
1. Request magic link
2. Intercept the URL
3. Modify the token parameter
4. Visit the modified URL
5. Verify: Error message

Expected Results:
- NextAuth validates token cryptographically
- Invalid token → error message
- No authentication bypass

**Test Case 20: CSRF Attack**

Steps:
1. Attempt to submit magic link request from external site
2. Verify: CSRF protection active

Expected Results:
- NextAuth CSRF protection prevents external submissions
- Only requests from BragDoc origin work

### 8.5: Mobile Testing

**Test on multiple devices/sizes:**
- iPhone (Safari)
- Android (Chrome)
- iPad (Safari)
- Mobile Chrome DevTools

**Test Cases:**
1. Registration form layout
2. Login form layout
3. "Check your email" confirmation
4. Email rendering (Gmail mobile app, iOS Mail)
5. Magic link click (opens in mobile browser)
6. Authentication flow completion

Expected Results:
- Responsive layouts work
- Forms are usable on small screens
- Emails render correctly
- Links open correctly
- Authentication completes successfully

### 8.6: Performance Testing

**Metrics to Check:**

1. **Email Delivery Time**
   - Measure time from "Send magic link" to email arrival
   - Expected: < 30 seconds
   - Test with multiple email providers

2. **Page Load Time**
   - Registration page
   - Login page
   - Dashboard after authentication
   - Expected: < 2 seconds

3. **Magic Link Validation Time**
   - Time from clicking link to redirect
   - Expected: < 1 second

4. **Token Generation Time**
   - Time to generate verification token
   - Expected: < 100ms (NextAuth handles this)

**Tools:**
- Browser DevTools Network tab
- Lighthouse performance audit
- Real email providers (not test accounts)

### 8.7: Create Test Report

**Document all test results:**

**File:** `/Users/ed/Code/brag-ai/tasks/email-magiclink/TEST-REPORT.md`

```markdown
# Magic Link Authentication Test Report

## Date: [Date]
## Tester: [Name]
## Environment: [Development/Staging]

## Functional Tests

| Test Case | Status | Notes |
|-----------|--------|-------|
| New user signup (magic link) | ✅ Pass | Email received in 15s |
| Existing user login (magic link) | ✅ Pass | Correct email content |
| Google OAuth signup | ✅ Pass | Welcome email sent |
| GitHub OAuth login | ✅ Pass | - |
| Account linking (Magic → Google) | ✅ Pass | Same user ID confirmed |
| Account linking (GitHub → Magic) | ✅ Pass | Achievements preserved |

## Edge Cases

| Test Case | Status | Notes |
|-----------|--------|-------|
| Expired token | ✅ Pass | Clear error message |
| Token already used | ✅ Pass | - |
| Email delivery failure | ✅ Pass | - |
| Invalid email format | ✅ Pass | HTML5 validation |
| ToS not accepted | ✅ Pass | Required attribute |
| Multiple magic links | ✅ Pass | Latest link works |
| Different email formats | ✅ Pass | All tested providers work |

## PostHog Tracking

| Test Case | Status | Notes |
|-----------|--------|-------|
| Anonymous → Magic link | ✅ Pass | Aliasing confirmed in PostHog |
| Anonymous → OAuth | ✅ Pass | - |
| Direct login (no anonymous) | ✅ Pass | No errors |

## Security

| Test Case | Status | Notes |
|-----------|--------|-------|
| SQL injection | ✅ Pass | No vulnerability |
| XSS | ✅ Pass | No execution |
| Token manipulation | ✅ Pass | Validation works |
| CSRF | ✅ Pass | Protected |

## Mobile

| Device | Status | Notes |
|--------|--------|-------|
| iPhone 14 (Safari) | ✅ Pass | Good layout |
| Android (Chrome) | ✅ Pass | - |
| iPad (Safari) | ✅ Pass | - |

## Performance

| Metric | Result | Target | Status |
|--------|--------|--------|--------|
| Email delivery time | 18s | < 30s | ✅ Pass |
| Magic link validation | 0.8s | < 1s | ✅ Pass |
| Page load time | 1.2s | < 2s | ✅ Pass |

## Issues Found

[List any issues discovered during testing]

## Recommendations

[Any suggestions for improvements]

## Conclusion

[Overall assessment of the implementation]
```

**Testing Checkpoint:** ✅ All tests pass, system ready for deployment

### 8.8: Add Tests to Master Test Plan

**Purpose:** Integrate this feature's tests into the master test plan for ongoing regression testing.

**Task:**
- [ ] Run the `/add-to-test-plan` SlashCommand to add tests from TEST-REPORT.md to the master test plan
- [ ] Command: `/add-to-test-plan tasks/email-magiclink/TEST-REPORT.md`
- [ ] Verify tests are properly categorized in the master test plan
- [ ] Ensure critical test cases are marked for regular execution

**Expected Result:**
- Magic link authentication tests are part of ongoing QA process
- Regression testing will catch any future issues with auth flow

---

## Phase 9: Deployment Preparation

**Purpose:** Prepare the magic link authentication system for production deployment, including environment variables, monitoring setup, and rollback plan.

**Acceptance Criteria:**
- Environment variables configured in production
- Monitoring and alerts set up
- Rollback plan documented and tested
- Deployment checklist complete
- Team notified of changes

**Tasks:**

### 9.1: Configure Production Environment Variables

**Production Environment:**
- Cloudflare Workers (apps/web deployment target)

**Required Variables:**

```bash
# Mailgun SMTP (for magic links)
MAILGUN_SMTP_SERVER="smtp.mailgun.org"
MAILGUN_SMTP_LOGIN="postmaster@mg.bragdoc.ai"
MAILGUN_SMTP_PASSWORD="[production-smtp-password]"

# Mailgun API (already exists, keep for other emails)
MAILGUN_API_KEY="[production-api-key]"
MAILGUN_DOMAIN="mg.bragdoc.ai"

# NextAuth (already exists, verify)
NEXTAUTH_URL="https://www.bragdoc.ai"
AUTH_SECRET="[production-secret]"

# OAuth (already exists, keep)
GOOGLE_CLIENT_ID="[production-google-id]"
GOOGLE_CLIENT_SECRET="[production-google-secret]"
GITHUB_CLIENT_ID="[production-github-id]"
GITHUB_CLIENT_SECRET="[production-github-secret]"

# PostHog (already exists, keep)
NEXT_PUBLIC_POSTHOG_KEY="[production-posthog-key]"
NEXT_PUBLIC_POSTHOG_HOST="https://app.posthog.com"
```

**Verification Steps:**

1. Check Cloudflare Workers environment variables:
```bash
# Via Cloudflare dashboard or CLI
wrangler secret list
```

2. Ensure all required variables are set

3. Test Mailgun SMTP credentials:
```bash
# Send test email via SMTP
# Use Mailgun dashboard or SMTP test tool
```

### 9.2: Set Up Monitoring

**Metrics to Monitor:**

1. **Email Delivery Success Rate**
   - Track via Mailgun dashboard
   - Set up alert if < 95% success rate

2. **Magic Link Click-Through Rate**
   - Track via PostHog: `user_registered` / magic links sent
   - Expected: > 80%

3. **Authentication Error Rate**
   - Track via application logs
   - Alert if > 5% error rate

4. **Token Expiry Rate**
   - Track how often users click expired links
   - Indicates if 24-hour expiry is appropriate

**PostHog Custom Events:**

Add custom events to track magic link flow:

**File:** `/Users/ed/Code/brag-ai/apps/web/components/magic-link-auth-form.tsx`

Add tracking to the form:

```typescript
// After successful email send
await captureEvent('magic_link_sent', {
  mode: mode, // 'login' or 'register'
});

// After email send error
await captureEvent('magic_link_failed', {
  mode: mode,
  error: error.message,
});
```

**Note:** Use client-side PostHog for these events since they happen before authentication.

**Mailgun Monitoring:**

- Check Mailgun dashboard daily for delivery issues
- Set up webhook for bounce notifications
- Monitor spam complaints

### 9.3: Create Rollback Plan

**Rollback Scenarios:**

#### Scenario 1: Critical Email Delivery Issues

**Symptoms:**
- Magic links not being delivered
- Mailgun errors in logs
- User reports of missing emails

**Rollback Steps:**

1. **Immediate:** Add Credentials provider back to NextAuth config

**File:** `/Users/ed/Code/brag-ai/apps/web/app/(auth)/auth.ts`

```typescript
// Add back temporarily:
import { compare } from 'bcrypt-ts';

providers: [
  // ... existing providers
  Credentials({
    credentials: {},
    async authorize({ email, password }: any) {
      const users = await getUser(email);
      if (users.length === 0) return null;
      // Check if password exists (might be null for magic link users)
      if (!users[0]!.password) return null;
      const passwordsMatch = await compare(password, users[0]!.password);
      if (!passwordsMatch) return null;
      return { ...users[0], provider: 'credentials' } as any;
    },
  }),
],
```

2. **Deploy:** Redeploy web app with credentials provider

3. **Restore:** Restore AuthForm component from git history

4. **Update:** Temporarily update login/register pages to use AuthForm

5. **Communicate:** Notify users via banner: "Password login temporarily restored"

**Recovery Time:** 15-30 minutes

**Data Loss:** None (password hashes still in database if Phase 6 not completed)

#### Scenario 2: PostHog Aliasing Issues

**Symptoms:**
- Duplicate user identities in PostHog
- Anonymous events not merging

**Rollback Steps:**

1. **Investigate:** Check PostHog live events for `$create_alias`

2. **Fix:** Update `createUser` event in auth.ts to debug aliasing

3. **No Rollback Needed:** Authentication still works, only tracking is affected

#### Scenario 3: Account Linking Failures

**Symptoms:**
- Users creating duplicate accounts
- OAuth + magic link not linking

**Rollback Steps:**

1. **Investigate:** Check Account table for duplicate userId entries

2. **Fix:** Verify NextAuth adapter is correctly configured

3. **Manual Merge:** Manually merge duplicate accounts in database if needed

**No Full Rollback Required:** Only affects multi-provider users

### 9.4: Pre-Deployment Checklist

**Code Checklist:**

- [ ] All password-related code removed
- [ ] Magic link email template tested and renders correctly
- [ ] NextAuth Email provider configured
- [ ] PostHog aliasing updated and tested
- [ ] OAuth providers still work
- [ ] Account linking tested
- [ ] Error handling implemented
- [ ] Mobile responsive
- [ ] TypeScript compilation successful
- [ ] All tests passing

**Infrastructure Checklist:**

- [ ] Production environment variables set
- [ ] Mailgun SMTP credentials verified
- [ ] Email deliverability tested
- [ ] Monitoring configured
- [ ] Alerts set up
- [ ] Rollback plan documented
- [ ] Team notified

**Documentation Checklist:**

- [ ] CLAUDE.md updated
- [ ] Technical docs updated
- [ ] API docs verified
- [ ] User-facing docs updated (if applicable)
- [ ] Test report created
- [ ] Deployment plan documented

**Deployment Checklist:**

- [ ] Database migration ready (if Phase 6 completed)
- [ ] Code merged to production branch
- [ ] Build successful
- [ ] Staging deployment successful
- [ ] Staging smoke tests pass
- [ ] Production deployment scheduled
- [ ] Communication plan ready

### 9.5: Deployment Communication

**Internal Team Communication:**

**Subject:** Magic Link Authentication Deployment - [Date]

**Message:**

> Hi team,
>
> We're deploying passwordless magic link authentication on [Date] at [Time].
>
> **Changes:**
> - Email/password login removed
> - Magic link login added (no password needed)
> - OAuth (Google, GitHub) unchanged
> - Existing users can log in with magic links (same accounts)
>
> **User Impact:**
> - No passwords required anymore
> - Users receive email with sign-in link
> - 24-hour link expiry
> - Faster, more secure authentication
>
> **Monitoring:**
> - Email delivery via Mailgun dashboard
> - Auth metrics in PostHog
> - Error logs in [logging system]
>
> **Rollback:**
> - Credentials provider can be re-added if needed
> - ~20 minute rollback time
> - No data loss
>
> **Support:**
> - Monitor for login issues
> - Check Mailgun for email delivery
> - Escalate critical issues immediately
>
> Thanks!

**User Communication (Optional):**

If you want to notify users proactively:

**In-App Banner (Optional):**

```typescript
// apps/web/components/auth-update-banner.tsx
"We've simplified login! No more passwords - just check your email for a magic link."
```

**Email to Active Users (Optional):**

Only if you expect confusion. Most users won't notice the change.

### 9.6: Post-Deployment Verification

**Immediately After Deployment:**

1. **Test new user signup:**
   - Create test account via magic link
   - Verify email delivery
   - Verify authentication works
   - Check database for new user

2. **Test existing user login:**
   - Use an existing account
   - Request magic link
   - Verify login works
   - Verify same user ID

3. **Test OAuth:**
   - Sign in with Google
   - Sign in with GitHub
   - Verify unchanged behavior

4. **Check monitoring:**
   - PostHog events flowing
   - Mailgun emails sending
   - No errors in logs

5. **Monitor for 1 hour:**
   - Watch for authentication failures
   - Check error rates
   - Monitor email delivery

**24 Hours After Deployment:**

1. Review metrics:
   - Authentication success rate
   - Email delivery rate
   - Magic link click-through rate
   - User complaints (support tickets)

2. Verify PostHog aliasing:
   - Check user streams for merged events
   - Confirm no duplicate identities

3. Database health:
   - Check for duplicate accounts
   - Verify account linking works

**7 Days After Deployment:**

1. If stable, consider Phase 6 (database cleanup)
2. Update rollback plan (can simplify)
3. Remove temporary monitoring

**Testing Checkpoint:** ✅ Deployment preparation complete

---

## Phase 10: After-Action Report

**Purpose:** Submit an after-action report to the process-manager agent documenting the implementation process, outcomes, and lessons learned.

**Acceptance Criteria:**
- Report submitted to process-manager agent
- All required sections completed
- Lessons learned documented
- Process improvements identified

**Tasks:**

### 10.1: Create After-Action Report

**File:** `/Users/ed/Code/brag-ai/tasks/email-magiclink/AFTER-ACTION-REPORT.md`

**Task:**
- [ ] Read the after-action report template at `.claude/docs/after-action-reports/README.md`
- [ ] Create report following the template structure
- [ ] Complete all required sections with specific details from this implementation

**Template Structure (from `.claude/docs/after-action-reports/README.md`):**

```markdown
# After-Action Report: Magic Link Authentication Migration

## Metadata

- **Task Name:** Magic Link Authentication Migration
- **Date Completed:** [YYYY-MM-DD]
- **Agent/Person:** [Agent name]
- **Related Files:**
  - SPEC: /Users/ed/Code/brag-ai/tasks/email-magiclink/SPEC.md
  - PLAN: /Users/ed/Code/brag-ai/tasks/email-magiclink/PLAN.md
  - LOG: /Users/ed/Code/brag-ai/tasks/email-magiclink/LOG.md

## Task Summary

Migrated BragDoc from email/password authentication to passwordless magic link authentication using NextAuth's Email provider. Removed credentials provider, simplified PostHog identity aliasing to a single unified flow, and improved security by eliminating password storage.

## Process Used

Followed the PLAN.md file with 10 phases:
1. Create Magic Link Email Template
2. Configure NextAuth Email Provider
3. Update UI/UX for Magic Links
4. Remove Credentials Provider and Password Logic
5. Update PostHog Integration
6. Database Schema Cleanup (Optional)
7. Documentation Updates
8. Testing & Verification
9. Deployment Preparation
10. After-Action Report

**Process Quality:** [Excellent/Good/Fair/Poor]

**What Worked Well:**
- Phased approach allowed testing at each stage
- Hard cutover decision simplified implementation
- Existing email infrastructure made integration smooth
- Comprehensive testing plan caught edge cases early

**What Could Be Improved:**
- [Add any process improvements]

## Results

**Implementation Status:** [Completed/Partial/Blocked]

**Key Metrics:**
- Email delivery time: [X] seconds (target: < 30s)
- Authentication success rate: [X]% (target: > 95%)
- Magic link click-through rate: [X]% (target: > 80%)
- Rollback preparedness: [Yes/No]

**Issues Encountered:**
1. [List any issues and how they were resolved]
2. [...]

**Deviations from Plan:**
- [Any deviations and reasons]

## Lessons Learned

### Technical Lessons

1. **NextAuth Email Provider:**
   - [What we learned about the Email provider]
   - [Configuration gotchas]

2. **Account Linking:**
   - [How NextAuth handles account linking]
   - [Edge cases discovered]

3. **PostHog Aliasing:**
   - [Cookie-based aliasing insights]
   - [Timing considerations]

### Process Lessons

1. **Planning:**
   - [What worked well in the plan]
   - [What was missing]

2. **Testing:**
   - [Effective test strategies]
   - [Tests that found critical issues]

3. **Deployment:**
   - [Deployment preparation effectiveness]
   - [Monitoring insights]

### User Experience Lessons

1. **Magic Link Adoption:**
   - [User response to passwordless auth]
   - [Confusion points]

2. **Email Delivery:**
   - [Mailgun reliability]
   - [Spam/deliverability issues]

## Process Improvements

### For This Type of Task

1. **Authentication Migrations:**
   - [Recommendations for future auth changes]
   - [Testing strategies to replicate]

2. **Email Integration:**
   - [Email template development best practices]
   - [Delivery monitoring approaches]

### For Team Processes

1. **Documentation:**
   - [Documentation updates needed]
   - [New patterns to document]

2. **Testing:**
   - [Test cases to add to standard suite]
   - [Edge cases to always check]

## Recommendations

### Immediate Actions

1. [Any urgent follow-up tasks]
2. [...]

### Future Enhancements

1. **Rate Limiting:**
   - Implement rate limiting for magic link requests (5 per hour per email)
   - Prevent abuse of email sending

2. **Token Expiry Customization:**
   - Consider shorter expiry for sensitive operations
   - User preference for link duration

3. **Email Template Variations:**
   - A/B test different email designs
   - Personalization based on user history

### Documentation Updates

1. **Process Documentation:**
   - Add "Authentication Migration Pattern" to `.claude/docs/processes/`
   - Document account linking testing checklist

2. **Technical Documentation:**
   - Update email integration patterns
   - Document PostHog aliasing edge cases

## Impact Assessment

### Code Quality Impact

- **Lines of Code:** [X lines removed, Y lines added, net Z reduction]
- **Complexity:** [Reduced/Increased/Unchanged]
- **Maintainability:** [Improved - unified auth flow]

### User Impact

- **Positive:**
  - No passwords to remember
  - Faster signup flow
  - More secure

- **Negative:**
  - Requires email access to sign in
  - 24-hour link expiry may frustrate some users

### Team Impact

- **Knowledge Transfer:** [What knowledge needs to be shared]
- **Training Needed:** [Any team training required]
- **Support Burden:** [Expected impact on support]

## Conclusion

[Overall summary of the implementation]

[Success/Failure assessment]

[Confidence in stability: High/Medium/Low]

---

**Report Submitted:** [Date]
**Submitted To:** process-manager agent
**Follow-Up Required:** [Yes/No]
```

### 10.2: Submit Report to Process-Manager Agent

**Action:** Communicate with the process-manager agent to submit this report.

**Message Template:**

> Hi process-manager agent,
>
> I've completed the magic link authentication migration task. Here's the after-action report:
>
> - **Task:** Email/password to magic link authentication migration
> - **Status:** [Completed/Partial]
> - **Report Location:** `/Users/ed/Code/brag-ai/tasks/email-magiclink/AFTER-ACTION-REPORT.md`
>
> **Key Outcomes:**
> - [Briefly summarize]
>
> **Process Improvements Identified:**
> - [List 2-3 key improvements]
>
> **Documentation Updates Needed:**
> - [List any doc updates]
>
> **Follow-Up Required:**
> - [Yes/No - specify if yes]
>
> Please review and let me know if you need any additional information.

### 10.3: Update Process Documentation (If Needed)

Based on lessons learned, update the following if applicable:

**File:** `.claude/docs/processes/authentication-migration-pattern.md` (create if needed)

Document the pattern for future authentication migrations:

```markdown
# Authentication Migration Pattern

This document outlines the standard approach for migrating authentication methods in BragDoc.

## Pattern Overview

[Based on magic link migration experience]

## Phases

1. Add new provider alongside existing
2. Test new provider thoroughly
3. Remove old provider
4. Clean up unused code
5. Update documentation
6. Deploy and monitor

## Testing Checklist

[Reusable checklist based on Phase 8]

## Rollback Procedures

[Standard rollback patterns]

## Lessons Learned

[Incorporate lessons from this migration]
```

**Testing Checkpoint:** ✅ After-action report complete and submitted

---

## Summary of Changes

### Files Created

1. `/Users/ed/Code/brag-ai/apps/web/emails/magic-link.tsx` - Magic link email template
2. `/Users/ed/Code/brag-ai/apps/web/components/magic-link-auth-form.tsx` - Magic link form component
3. `/Users/ed/Code/brag-ai/tasks/email-magiclink/TEST-REPORT.md` - Test results documentation
4. `/Users/ed/Code/brag-ai/tasks/email-magiclink/AFTER-ACTION-REPORT.md` - After-action report

### Files Modified

1. `/Users/ed/Code/brag-ai/apps/web/app/(auth)/auth.ts`
   - Add Email provider
   - Remove Credentials provider
   - Update PostHog aliasing in createUser event
   - Remove bcrypt import

2. `/Users/ed/Code/brag-ai/apps/web/lib/email/client.ts`
   - Add `renderMagicLinkEmail()` function
   - Add `sendMagicLinkEmail()` function

3. `/Users/ed/Code/brag-ai/apps/web/app/(auth)/register/page.tsx`
   - Replace AuthForm with MagicLinkAuthForm
   - Update copy for passwordless flow
   - Keep ToS acceptance

4. `/Users/ed/Code/brag-ai/apps/web/app/(auth)/login/page.tsx`
   - Replace AuthForm with MagicLinkAuthForm
   - Update copy for passwordless flow

5. `/Users/ed/Code/brag-ai/apps/web/lib/posthog-server.ts`
   - Add `aliasUser()` function (if not present)

6. `/Users/ed/Code/brag-ai/packages/database/src/schema.ts`
   - Remove `password` column from user table (Phase 6, optional)

7. `/Users/ed/Code/brag-ai/packages/database/src/queries.ts`
   - Update or remove `createUser()` function
   - Remove bcrypt import

8. `/Users/ed/Code/brag-ai/package.json`
   - Remove `bcrypt-ts` dependency

9. `/Users/ed/Code/brag-ai/.env.example`
   - Add MAILGUN_SMTP_* variables

10. `/Users/ed/Code/brag-ai/CLAUDE.md`
    - Update authentication section

11. `/Users/ed/Code/brag-ai/.claude/docs/tech/authentication.md`
    - Update authentication methods
    - Add magic link flow documentation
    - Remove credentials provider section

12. `/Users/ed/Code/brag-ai/.claude/docs/tech/frontend-patterns.md`
    - Add magic link form pattern

### Files Deleted

1. `/Users/ed/Code/brag-ai/apps/web/app/(auth)/actions.ts` - Server actions for credentials auth
2. `/Users/ed/Code/brag-ai/apps/web/components/auth-form.tsx` - Password-based form component

### Database Migrations

1. `00XX_remove_user_password.sql` - Remove password column (Phase 6, optional)

### Dependencies Removed

1. `bcrypt-ts` - No longer needed

---

## Risk Assessment

### High Risk

None identified.

### Medium Risk

1. **Email Delivery Reliability**
   - **Risk:** Magic links depend on email delivery. If Mailgun has issues, users can't sign in.
   - **Mitigation:** Monitor Mailgun closely, have rollback plan ready (re-enable credentials), test email deliverability thoroughly.

2. **User Confusion**
   - **Risk:** Users accustomed to passwords may be confused by magic links initially.
   - **Mitigation:** Clear UI copy, "no password needed" messaging, good error handling, consider optional in-app banner.

### Low Risk

1. **Account Linking Edge Cases**
   - **Risk:** Rare edge cases where account linking fails.
   - **Mitigation:** Comprehensive testing, manual merge procedures documented.

2. **PostHog Aliasing**
   - **Risk:** Aliasing issues create duplicate identities.
   - **Mitigation:** Thorough testing, monitoring, doesn't affect authentication itself.

---

## Success Criteria

### Must Have (Blocker if missing)

- ✅ Magic link authentication works for new users
- ✅ Magic link authentication works for existing users
- ✅ OAuth providers still work (Google, GitHub)
- ✅ No passwords stored or used
- ✅ PostHog aliasing works correctly
- ✅ Email delivery is reliable (<30 seconds)
- ✅ Rollback plan tested and documented

### Should Have (Important but not blocking)

- ✅ Account linking works (OAuth + magic link)
- ✅ Mobile experience is good
- ✅ Error handling is user-friendly
- ✅ Monitoring and alerts configured
- ✅ Documentation updated

### Nice to Have (Can be done post-launch)

- ⭕ Rate limiting for magic link requests
- ⭕ Database password column removed (Phase 6)
- ⭕ Email template A/B testing
- ⭕ User notification of auth change

---

## Open Questions & Decisions

### Resolved Decisions

1. **Migration Strategy:** Hard cutover (no dual auth period) ✅
   - **Rationale:** Simpler implementation, users adapt quickly to magic links

2. **Token Expiry:** 24 hours ✅
   - **Rationale:** NextAuth default, balances convenience and security

3. **ToS Acceptance:** Still required for new signups ✅
   - **Rationale:** Legal requirement unchanged

4. **Database Cleanup:** Optional, can be deferred ✅
   - **Rationale:** Password hashes are harmless, keeping allows rollback buffer

### Open Questions

1. **Rate Limiting:** Should we implement rate limiting in Phase 2 or defer?
   - **Recommendation:** Defer to post-launch enhancement
   - **Reason:** Not critical for launch, can add based on actual usage patterns

2. **User Notification:** Should we proactively notify users of the change?
   - **Recommendation:** Optional in-app banner, no email campaign
   - **Reason:** Most users won't notice, login page copy is sufficient

---

## Notes for Implementation Team

1. **Phase 6 is Optional:** You can defer database cleanup for 30 days to maintain a rollback buffer. The password column being unused is harmless.

2. **Test Email Deliverability Early:** Email delivery is critical. Test with real email providers (Gmail, Outlook) in Phase 1, not just test accounts.

3. **PostHog Cookie Timing:** The anonymous ID cookie must be set BEFORE authentication. Ensure marketing site and app site use the same PostHog key for cross-domain tracking.

4. **Account Linking is Automatic:** NextAuth handles account linking via email matching. You don't need to implement anything special, but you DO need to test it thoroughly.

5. **Magic Link URL Structure:** NextAuth generates URLs like `/api/auth/callback/email?token=xxx&email=xxx`. Don't modify these URLs.

6. **Token Security:** NextAuth handles token generation, validation, and single-use enforcement. Don't roll your own token logic.

7. **SMTP vs API:** We're using SMTP for magic links (NextAuth requirement), but keeping the Mailgun API for other emails (welcome, etc.). Both use the same Mailgun account.

8. **Environment Variables:** Ensure MAILGUN_SMTP_* variables are set in all environments (local, staging, production).

---

## Final Checklist

Before marking this plan complete:

- [ ] All phases documented
- [ ] Acceptance criteria clear for each phase
- [ ] Testing checkpoints defined
- [ ] Rollback plan documented
- [ ] Success criteria defined
- [ ] Timeline estimated
- [ ] Risks assessed and mitigated
- [ ] Open questions addressed
- [ ] Implementation notes provided
- [ ] After-action report phase included

---

**Plan Version:** 1.0
**Created:** 2025-01-24
**Created By:** spec-planner agent
**Reviewed By:** [To be reviewed by plan-improver]

**This plan follows the BragDoc development patterns defined in CLAUDE.md and technical documentation in `.claude/docs/tech/`.**
