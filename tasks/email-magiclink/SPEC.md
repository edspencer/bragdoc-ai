# Task: Migrate from Email/Password to Magic Link Authentication

## Summary

Replace the current credentials (email/password) authentication provider with NextAuth's Email (magic link) provider. This migration simplifies the authentication architecture by unifying all auth flows under NextAuth's provider system, eliminates the dual PostHog identity aliasing code paths, improves security by removing password storage, and provides a modern passwordless authentication experience.

## Background Reading

### Current Authentication Architecture

BragDoc currently supports three authentication methods:
1. **Email/Password** - Custom credentials provider with bcrypt password hashing
2. **Google OAuth** - NextAuth OAuth provider
3. **GitHub OAuth** - NextAuth OAuth provider

This creates **two distinct code paths** for PostHog identity aliasing:

**Path 1: Email/Password (Custom Flow)**
```
User submits form → register() server action → FormData contains anonymousId
→ captureServerEvent() → identifyUser() → aliasUser() with formData
```

**Path 2: OAuth (NextAuth Flow)**
```
User clicks OAuth button → Store anonymousId in cookie → OAuth redirect
→ NextAuth createUser event → aliasUser() with cookie
```

### The Problem

This dual-path architecture:
- Duplicates PostHog aliasing logic in two places
- Violates DRY (Don't Repeat Yourself) principle
- Increases maintenance burden
- Adds complexity and potential for bugs
- Requires different testing for each path

### The Solution

By replacing email/password with magic links, all authentication flows become NextAuth providers:

```
Magic Link Email → NextAuth Email provider → cookie → aliasUser()
Google OAuth     → NextAuth OAuth provider → cookie → aliasUser()
GitHub OAuth     → NextAuth OAuth provider → cookie → aliasUser()
```

**Result:** Single unified code path for all authentication methods.

### Why Magic Links?

**Security Benefits:**
- No passwords to leak or phish
- No password reset flows needed
- Reduced attack surface
- Email-based verification built-in

**User Experience:**
- Modern, familiar pattern (Slack, Notion, Linear all use magic links)
- Faster signup (no password requirements)
- No forgotten passwords
- Works well with password managers that support email

**Developer Experience:**
- Less code to maintain
- No bcrypt dependencies
- No password validation logic
- Unified auth architecture

**BragDoc Context:**
- Mailgun already configured and working
- Email delivery is reliable
- ToS acceptance flow already in place
- Welcome emails already sent on signup

## Specific Requirements

### Functional Requirements

1. **Add NextAuth Email Provider**
   - Configure with Mailgun SMTP credentials
   - Use existing `hello@bragdoc.ai` sender
   - Implement custom email template matching BragDoc branding
   - Set appropriate token expiry (default: 24 hours)

2. **Remove Credentials Provider**
   - Delete email/password registration flow
   - Remove password hashing/comparison logic
   - Clean up bcrypt dependencies
   - Archive or remove password-related database columns

3. **Simplify PostHog Aliasing**
   - Remove FormData-based aliasing from `register()` server action
   - Remove anonymous ID capture from registration form
   - Consolidate to single cookie-based aliasing in `createUser` event
   - Ensure consistent behavior across all auth methods

4. **Update UI/UX**
   - Replace password input with "Send magic link" button
   - Update registration page copy
   - Update login page copy
   - Add "Check your email" confirmation state
   - Provide clear instructions for first-time users

5. **Maintain Existing Functionality**
   - ToS/Privacy acceptance checkbox still required
   - Welcome email still sent after signup
   - OAuth providers (Google, GitHub) continue working
   - PostHog tracking continues working
   - All existing sessions remain valid

### Non-Functional Requirements

1. **Security**
   - Magic link tokens must be single-use
   - Tokens expire after 24 hours
   - Rate limiting on magic link requests (prevent spam)
   - Secure token generation (NextAuth handles this)

2. **Email Delivery**
   - Magic link emails delivered within 30 seconds
   - Email template is mobile-responsive
   - Clear call-to-action button
   - Fallback plain text version
   - Unsubscribe not applicable (transactional email)

3. **User Experience**
   - Clear error messages for expired/invalid links
   - Graceful handling of email delivery failures
   - Progress indicators during email send
   - Ability to resend magic link

4. **Migration Path**
   - Existing password-based users can still login (until migration complete)
   - No forced logout of existing sessions
   - Clear communication to users about the change
   - Optional: Allow existing users to continue using passwords

### Technical Requirements

1. **NextAuth Configuration**
   - Email provider properly configured with Mailgun SMTP
   - Custom email template using React Email
   - Proper callback URLs configured
   - Verification token table properly set up in database

2. **Database Schema**
   - Verification token table exists (should already exist via DrizzleAdapter)
   - Optional: Add migration to remove password column from user table
   - Ensure proper indexes on token table

3. **Environment Variables**
   - Mailgun SMTP credentials available
   - Email server configuration
   - Sender email address configured

4. **Testing**
   - Unit tests for magic link flow
   - Integration tests for full auth cycle
   - Email delivery tests
   - PostHog aliasing verification
   - OAuth providers still working

## Implementation Phases

### Phase 1: Add Magic Link Provider (Parallel to Existing)

**Goal:** Add magic links alongside existing email/password auth for testing.

**Tasks:**
1. Configure NextAuth Email provider with Mailgun SMTP
2. Create custom magic link email template using React Email
3. Add new "Sign in with email" option to login/register pages
4. Test magic link flow end-to-end
5. Verify PostHog aliasing works via cookie path
6. Test email delivery and template rendering

**Acceptance Criteria:**
- Magic links work for new signups
- Magic links work for existing user logins
- Email template matches BragDoc branding
- PostHog aliasing works correctly
- No disruption to existing auth methods

### Phase 2: Remove Credentials Provider

**Goal:** Remove email/password auth and simplify codebase.

**Tasks:**
1. Remove credentials provider from NextAuth config
2. Delete `register()` server action FormData handling
3. Remove password input from registration form
4. Remove bcrypt dependency
5. Clean up PostHog FormData aliasing code
6. Update UI copy and instructions
7. Remove password-related tests

**Acceptance Criteria:**
- Email/password login no longer available
- Magic link is only email-based auth option
- No broken code references to password auth
- All tests passing with new flow
- UI clearly guides users to magic link

### Phase 3: Database Cleanup (Optional)

**Goal:** Remove password-related database columns.

**Tasks:**
1. Create migration to remove `password` column from user table
2. Run migration in development
3. Test that existing magic link auth still works
4. Verify OAuth providers still work
5. Document the schema change

**Acceptance Criteria:**
- Password column removed from database
- No code references password column
- All auth methods continue working
- Migration is reversible if needed

## Migration Considerations

### Handling Existing Users

#### What Happens to Existing Email/Password Users?

When we remove the credentials provider, existing password users will seamlessly transition to magic links:

**User Data Preservation:**
- ✅ User ID remains exactly the same
- ✅ All achievements, projects, and data intact
- ✅ Email address unchanged
- ✅ OAuth connections (if any) still work
- ✅ PostHog identity unchanged (same user ID, no new aliasing needed)
- ❌ Password hash becomes unused (can be deleted in Phase 3)

**Login Flow for Existing Users:**

1. **User visits login page** (after password removal)
   - Sees "Sign in with email" (magic link option)
   - No password field available

2. **User enters their email** (same email they used before)
   - Clicks "Send magic link"
   - NextAuth checks: Does this email exist in our database?

3. **NextAuth finds existing user record**
   - Generates magic link token
   - Sends email with magic link
   - Email says "Sign in to BragDoc" (not "Sign up")

4. **User clicks magic link**
   - NextAuth validates token
   - Finds existing user by email
   - Logs them in as **THE SAME USER** (same user.id)
   - No new user created
   - Session created for existing user

5. **PostHog Impact**
   - `signIn` callback fires (NOT `createUser`)
   - PostHog already knows this user (user.id = abc-123)
   - No new identity created
   - No aliasing needed (they're not a new user)
   - All previous events still attributed to them

**Migration Strategies:**

**Option 1: Hard Cutover (Recommended)**
- Add magic link provider (Phase 1)
- Test thoroughly with new and existing users
- Remove password provider (Phase 2)
- Existing users automatically switch to magic link
- Active sessions remain valid (no forced logout)
- Users login with magic link on next visit

**Pros:**
- Clean, simple cutover
- Single auth flow immediately
- Users adapt quickly to magic links
- Less code to maintain
- Clear user experience

**Cons:**
- Slight surprise for users expecting password field
- Brief adjustment period

**Option 2: Gradual Migration**
- Keep both providers temporarily
- Show "We recommend using magic links" message
- Encourage but don't force migration
- Eventually remove password option after X weeks
- More complex transition period

**Pros:**
- Less disruptive to users
- Users can choose their timing
- Safety net for rollback

**Cons:**
- Maintains dual code paths longer
- Delayed benefit of simplified architecture
- More complex messaging
- Requires timeline management

**Recommendation:** Option 1 (Hard Cutover) because:
- Magic links are intuitive (Slack, Notion, Linear all use them)
- Login page will have clear instructions
- Users adapt within one login cycle
- Simplifies architecture immediately
- Existing sessions aren't interrupted

### Account Linking (Existing NextAuth Feature)

**No implementation required** - NextAuth automatically links accounts based on email matching. A user who signs up with GitHub can later login with magic link (same email) and access the same account.

**What we need to verify:**
- Account linking still works after adding Email provider
- User data remains intact when switching auth methods
- PostHog identity remains consistent (no duplicate users)

**Testing required:**
- GitHub user → Magic link login (same account)
- Magic link user → OAuth login (same account)

### Communication Plan

1. **Pre-Migration:**
   - No announcement needed (users won't notice during Phase 1)

2. **Post-Migration:**
   - Update login page with clear instructions
   - Consider optional in-app notification
   - Update help documentation

3. **Support:**
   - Monitor for login issues
   - Clear error messages for common problems
   - Quick rollback plan if needed

### Rollback Plan

If magic links cause significant issues:

1. **Immediate Rollback:**
   - Re-add credentials provider to NextAuth config
   - Redeploy previous version
   - Existing sessions unaffected

2. **Database Rollback:**
   - If Phase 3 completed, restore password column
   - Existing password hashes still in backups

3. **Monitoring:**
   - Track login success/failure rates
   - Monitor email delivery rates
   - Watch for support tickets

## Technical Details

### NextAuth Email Provider Configuration

```typescript
import Email from 'next-auth/providers/email';

providers: [
  Email({
    server: {
      host: process.env.MAILGUN_SMTP_SERVER,
      port: 587,
      auth: {
        user: process.env.MAILGUN_SMTP_LOGIN,
        pass: process.env.MAILGUN_SMTP_PASSWORD,
      },
    },
    from: 'hello@bragdoc.ai',
    // Custom email template
    sendVerificationRequest: async ({ identifier, url, provider }) => {
      // Use existing sendEmail function with custom template
      await sendMagicLinkEmail({ to: identifier, url });
    },
  }),
  Google({ /* existing */ }),
  GitHub({ /* existing */ }),
]
```

### Custom Magic Link Email Template

Create a new React Email template at `apps/web/emails/magic-link.tsx`:

```typescript
interface MagicLinkEmailProps {
  magicLink: string;
}

export function MagicLinkEmail({ magicLink }: MagicLinkEmailProps) {
  return (
    <Html>
      <Head />
      <Body>
        <Container>
          <Heading>Sign in to BragDoc</Heading>
          <Text>Click the button below to sign in to your account:</Text>
          <Button href={magicLink}>Sign In</Button>
          <Text>This link will expire in 24 hours.</Text>
          <Text>If you didn't request this email, you can safely ignore it.</Text>
        </Container>
      </Body>
    </Html>
  );
}
```

### Simplified PostHog Aliasing

After migration, only one aliasing path remains in `auth.ts`:

```typescript
events: {
  async createUser({ user }) {
    // Track registration
    await captureServerEvent(user.id, 'user_registered', { ... });
    await identifyUser(user.id, { ... });

    // Alias anonymous ID (works for ALL providers)
    const cookieStore = await cookies();
    const anonymousId = cookieStore.get('ph_anonymous_id')?.value;
    if (anonymousId && anonymousId !== user.id) {
      await aliasUser(user.id, anonymousId);
      cookieStore.delete('ph_anonymous_id');
    }

    // Send welcome email
    await sendWelcomeEmail({ ... });
  }
}
```

**Deleted code:**
- `apps/web/app/(auth)/actions.ts` - FormData handling and aliasing
- `apps/web/app/(auth)/register/page.tsx` - Anonymous ID capture
- Credentials provider from `auth.ts`

## Testing Strategy

### Unit Tests

1. **Email Sending:**
   - Test magic link email generation
   - Verify email content and formatting
   - Test with different email providers

2. **Token Generation:**
   - Verify token uniqueness
   - Test expiration logic
   - Test single-use enforcement

### Integration Tests

1. **Full Auth Flow (New Users):**
   - New user requests magic link
   - Email delivered
   - User clicks link
   - User authenticated
   - Session created
   - PostHog aliased correctly (anonymous → user ID)

2. **Existing User Login:**
   - User with existing password account requests magic link
   - Email delivered (says "Sign in" not "Sign up")
   - User clicks link
   - Logged in as SAME user ID (not new user created)
   - All data intact (achievements, projects)
   - PostHog identity unchanged (no new aliasing)

3. **Error Cases:**
   - Expired token
   - Invalid token
   - Token already used
   - Email delivery failure

4. **OAuth Compatibility:**
   - Google OAuth still works
   - GitHub OAuth still works
   - PostHog aliasing works for all methods

### Manual Testing

1. **New User Experience:**
   - Request magic link (new email)
   - Check email inbox
   - Click magic link
   - Verify successful signup
   - Check PostHog for merged events (anonymous → user ID)

2. **Existing User Experience:**
   - Create test user with password
   - Log out
   - Request magic link (same email)
   - Verify email says "Sign in" (not "Sign up")
   - Click magic link
   - Verify logged in as same user (check user ID in session)
   - Verify all data still accessible
   - Check PostHog shows same identity (no duplicate)

3. **Account Linking - GitHub to Magic Link:**
   - Sign up with GitHub OAuth (note user ID)
   - Create some achievements/projects
   - Log out
   - Request magic link with same email used by GitHub
   - Click magic link
   - Verify logged in as SAME user ID
   - Verify all achievements/projects still accessible
   - Check Account table: should have two records (github + email) with same userId
   - Check PostHog: same identity, no duplicate

4. **Account Linking - Magic Link to GitHub:**
   - Sign up with magic link (note user ID)
   - Create some achievements/projects
   - Log out
   - Login with GitHub OAuth (same email)
   - Verify logged in as SAME user ID
   - Verify all achievements/projects still accessible
   - Check Account table: should have two records (email + github) with same userId
   - Check PostHog: same identity, no duplicate

5. **Account Linking - Magic Link to Google:**
   - Sign up with magic link (note user ID)
   - Create some data
   - Log out
   - Login with Google OAuth (same email)
   - Verify same user ID and data accessible

6. **Edge Cases:**
   - Spam protection (rate limiting)
   - Mobile email clients
   - Different email providers (Gmail, Outlook, etc.)
   - Link expiry behavior
   - Existing user trying to "sign up" with magic link (should login, not create duplicate)
   - Different emails for different providers (should create separate accounts)

## Environment Variables

Required environment variables:

```bash
# Mailgun SMTP (should already exist)
MAILGUN_SMTP_SERVER=smtp.mailgun.org
MAILGUN_SMTP_LOGIN=postmaster@mg.bragdoc.ai
MAILGUN_SMTP_PASSWORD=your_smtp_password

# Or use existing Mailgun API credentials
MAILGUN_API_KEY=your_api_key
MAILGUN_DOMAIN=mg.bragdoc.ai

# Email sender
EMAIL_FROM=hello@bragdoc.ai

# NextAuth (should already exist)
NEXTAUTH_URL=https://www.bragdoc.ai
AUTH_SECRET=your_secret
```

## Dependencies

**Add:**
- None (NextAuth Email provider is built-in)

**Remove:**
- `bcrypt-ts` (used only for password hashing)

**Keep:**
- `@react-email/*` (for magic link template)
- `mailgun.js` (for email delivery)
- All other existing dependencies

## Success Criteria

### Phase 1 Complete When:
- [ ] Magic link provider configured and working
- [ ] Custom email template created and tested
- [ ] New users can signup via magic link
- [ ] Existing users can login via magic link
- [ ] PostHog aliasing works correctly
- [ ] Email delivery is reliable (< 30 second delivery)
- [ ] No disruption to OAuth providers
- [ ] Account linking verified: GitHub user can login with magic link (same account)
- [ ] Account linking verified: Magic link user can login with OAuth (same account)

### Phase 2 Complete When:
- [ ] Credentials provider removed from codebase
- [ ] Password-related code deleted
- [ ] FormData PostHog aliasing removed
- [ ] Registration/login UI updated
- [ ] All tests passing
- [ ] Documentation updated
- [ ] Single unified auth flow verified

### Phase 3 Complete When:
- [ ] Password column removed from database
- [ ] Migration tested and verified
- [ ] All auth methods still working
- [ ] Schema changes documented

## Open Questions

1. **Token Expiry:** Should magic links expire after 24 hours (default) or shorter/longer?
   - **Recommendation:** Keep 24 hours for user convenience

2. **Rate Limiting:** How many magic link requests per hour per email?
   - **Recommendation:** 5 requests per hour per email address

3. **Existing Users:** Force password users to migrate immediately or gradual?
   - **Recommendation:** Immediate (clean cutover, users adapt quickly)
   - **Details:** See "Handling Existing Users" section - they seamlessly transition to magic links, same user ID, no data loss, no PostHog aliasing needed (they're existing users, not new signups)

4. **Password Column:** Remove from database or keep for potential rollback?
   - **Recommendation:** Keep initially, remove after 30 days if no issues
   - **Rationale:** Password hashes become unused but keeping them allows rollback if critical issues arise

5. **ToS Acceptance:** Still require on magic link signup or trust email ownership?
   - **Recommendation:** Still require (legal requirement doesn't change)
   - **Implementation:** Add ToS checkbox to magic link signup flow (only for NEW users)

6. **PostHog Aliasing for Existing Users:** Do we need to alias when existing password users login with magic link?
   - **Answer:** No aliasing needed
   - **Reason:** They're logging IN (not signing up), so `signIn` callback fires, not `createUser`. PostHog already knows their user ID from original signup. Same user ID = same PostHog identity.

## References

- [NextAuth Email Provider Documentation](https://next-auth.js.org/providers/email)
- [React Email Documentation](https://react.email/docs/introduction)
- [Mailgun SMTP Documentation](https://documentation.mailgun.com/en/latest/user_manual.html#smtp)
- [BragDoc Email Client Implementation](apps/web/lib/email/client.ts)
- [PostHog Identity Aliasing](apps/web/lib/posthog-server.ts)

## Notes

- This migration simplifies the authentication architecture significantly
- The dual PostHog aliasing paths were the primary motivation
- Magic links provide better security than passwords
- User experience may improve (no forgotten passwords)
- Email delivery reliability is critical - monitor closely
- Rollback plan is straightforward if needed
- Consider A/B testing conversion rates before/after migration
