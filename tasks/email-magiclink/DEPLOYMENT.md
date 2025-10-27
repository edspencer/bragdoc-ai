# Magic Link Authentication - Deployment Guide

## Document Overview

This deployment guide provides comprehensive information for deploying the magic link authentication system to production. It includes environment configuration, monitoring setup, rollback procedures, deployment checklist, communication plan, and post-deployment verification steps.

**Feature:** Passwordless Magic Link Authentication (Email-based)
**Migration:** Email/Password → Magic Links
**Created:** 2025-10-26
**Status:** Ready for deployment preparation (pending demo account fix)

---

## Table of Contents

1. [Environment Variables](#1-environment-variables)
2. [Monitoring Requirements](#2-monitoring-requirements)
3. [Rollback Plan](#3-rollback-plan)
4. [Pre-Deployment Checklist](#4-pre-deployment-checklist)
5. [Communication Plan](#5-communication-plan)
6. [Post-Deployment Verification](#6-post-deployment-verification)
7. [Known Issues and Blockers](#7-known-issues-and-blockers)

---

## 1. Environment Variables

### Production Environment Configuration

**Deployment Target:** Cloudflare Workers (apps/web)

### Required Environment Variables

#### Mailgun SMTP (Magic Link Emails)

These variables are **REQUIRED** for magic link authentication to function:

```bash
# Mailgun SMTP server
MAILGUN_SMTP_SERVER="smtp.mailgun.org"

# Mailgun SMTP login (usually postmaster@mg.bragdoc.ai)
MAILGUN_SMTP_LOGIN="postmaster@mg.bragdoc.ai"

# Mailgun SMTP password (obtain from Mailgun dashboard)
MAILGUN_SMTP_PASSWORD="[PRODUCTION-SMTP-PASSWORD]"
```

**How to obtain SMTP credentials:**

1. Log into Mailgun dashboard (https://app.mailgun.com)
2. Navigate to Sending → Domain Settings → SMTP credentials
3. Copy the SMTP login and password
4. Server: smtp.mailgun.org (port 587)

**Security Note:** SMTP password is sensitive. Store in environment variables, never commit to git.

#### Mailgun API (Existing - Keep)

These variables are already configured for other emails (welcome, etc.) and should remain:

```bash
# Mailgun API (for welcome emails, etc.)
MAILGUN_API_KEY="[PRODUCTION-API-KEY]"
MAILGUN_DOMAIN="mg.bragdoc.ai"
```

**Note:** Magic links use SMTP (required by NextAuth), while other emails use the API.

#### NextAuth Configuration (Existing - Verify)

These should already be configured, but verify they're correct:

```bash
# NextAuth base URL
NEXTAUTH_URL="https://www.bragdoc.ai"

# NextAuth secret key (used for JWT signing)
AUTH_SECRET="[PRODUCTION-SECRET]"
```

**Security:** `AUTH_SECRET` must be a strong random string (minimum 32 characters).

#### OAuth Providers (Existing - Keep)

These should remain unchanged:

```bash
# Google OAuth
GOOGLE_CLIENT_ID="[PRODUCTION-GOOGLE-CLIENT-ID]"
GOOGLE_CLIENT_SECRET="[PRODUCTION-GOOGLE-CLIENT-SECRET]"

# GitHub OAuth
GITHUB_CLIENT_ID="[PRODUCTION-GITHUB-CLIENT-ID]"
GITHUB_CLIENT_SECRET="[PRODUCTION-GITHUB-CLIENT-SECRET]"
```

#### PostHog Analytics (Existing - Keep)

```bash
# PostHog analytics
NEXT_PUBLIC_POSTHOG_KEY="[PRODUCTION-POSTHOG-KEY]"
NEXT_PUBLIC_POSTHOG_HOST="https://app.posthog.com"
```

### Configuration Steps

#### For Cloudflare Workers:

**Via Cloudflare Dashboard:**

1. Log into Cloudflare dashboard
2. Navigate to Workers & Pages → Your Worker
3. Settings → Variables
4. Add/verify all environment variables listed above

**Via Wrangler CLI:**

```bash
# Set SMTP credentials
wrangler secret put MAILGUN_SMTP_PASSWORD

# Verify all secrets
wrangler secret list
```

#### For Local Development:

Add to `.env` file (not committed to git):

```bash
# Copy from .env.example
cp .env.example .env

# Add Mailgun SMTP credentials
# Edit .env and add:
MAILGUN_SMTP_SERVER="smtp.mailgun.org"
MAILGUN_SMTP_LOGIN="postmaster@mg.bragdoc.ai"
MAILGUN_SMTP_PASSWORD="[YOUR-LOCAL-SMTP-PASSWORD]"
```

### Verification

**Test SMTP credentials before deployment:**

```bash
# Option 1: Use Mailgun dashboard SMTP test tool
# Navigate to Sending → Domain Settings → SMTP credentials → Test

# Option 2: Use a script to send test email via SMTP
# (Create a simple Node.js script with nodemailer)
```

**Expected result:** Test email delivered successfully within 30 seconds.

---

## 2. Monitoring Requirements

### Metrics to Monitor

#### Email Delivery Success Rate

**What to monitor:**
- Percentage of magic link emails successfully delivered
- Email bounce rate
- Email spam complaints
- Average delivery time

**Where to monitor:**
- Mailgun dashboard (Sending → Logs)
- Mailgun webhooks for real-time alerts

**Target metrics:**
- Success rate: > 95%
- Average delivery time: < 30 seconds
- Bounce rate: < 2%
- Spam complaints: < 0.1%

**Alert triggers:**
- Success rate drops below 90%
- Delivery time exceeds 60 seconds
- Sudden spike in bounces or spam complaints

#### Magic Link Click-Through Rate

**What to monitor:**
- Percentage of magic link emails that are clicked
- Time between email sent and link clicked
- Expired token rate (users clicking after 24 hours)

**How to track:**
- PostHog custom events
- Database query: Count verification tokens created vs. used

**Target metrics:**
- Click-through rate: > 80%
- Median time to click: < 5 minutes
- Expired token rate: < 5%

**Alert triggers:**
- Click-through rate drops below 60%
- Expired token rate exceeds 10% (may need shorter expiry)

#### Authentication Success Rate

**What to monitor:**
- Percentage of authentication attempts that succeed
- Authentication errors by type
- New user signup rate
- Existing user login rate

**Where to monitor:**
- Application logs (Cloudflare Workers logs)
- PostHog events: `user_registered`, `user_logged_in`

**Target metrics:**
- Overall success rate: > 95%
- Error rate: < 5%

**Alert triggers:**
- Success rate drops below 90%
- Error rate exceeds 10%
- Zero signups/logins for > 30 minutes (possible outage)

#### Token Expiry and Reuse Attempts

**What to monitor:**
- Users clicking expired magic links (after 24 hours)
- Users trying to reuse magic links (after first use)
- Multiple magic link requests from same email

**How to track:**
- NextAuth error events
- Custom logging in auth.ts

**Target metrics:**
- Expired link clicks: < 5%
- Reuse attempts: < 2%

**Alert triggers:**
- Sudden spike in expired/reused link errors (may indicate attack)

### PostHog Custom Events

Add custom event tracking to monitor magic link flow:

**Events to track:**

1. **`magic_link_requested`**
   - Triggered: When user submits email on login/register page
   - Properties: mode (login/register), email_domain
   - Purpose: Track conversion funnel

2. **`magic_link_sent`**
   - Triggered: After email successfully sent
   - Properties: mode, email_domain
   - Purpose: Confirm email delivery initiated

3. **`magic_link_failed`**
   - Triggered: If email sending fails
   - Properties: mode, error_message
   - Purpose: Alert to email delivery issues

4. **`magic_link_clicked`**
   - Triggered: When user clicks link in email
   - Properties: mode, time_since_sent
   - Purpose: Measure click-through time

5. **`magic_link_expired`**
   - Triggered: When user clicks expired link
   - Properties: time_since_sent
   - Purpose: Identify if 24-hour expiry is too short

**Implementation:** Add these events to `MagicLinkAuthForm` component and NextAuth callbacks.

### Mailgun Webhook Configuration

Set up Mailgun webhooks to receive real-time notifications:

**Webhooks to configure:**

1. **Delivered** - Confirm email delivery
2. **Bounced** - Track failed deliveries
3. **Complained** - Track spam complaints
4. **Opened** (optional) - Track email opens
5. **Clicked** (optional) - Track link clicks

**Webhook endpoint:** Create `/api/webhooks/mailgun` route in Next.js

**Configuration:**
```bash
# Mailgun dashboard → Webhooks → Add webhook
URL: https://www.bragdoc.ai/api/webhooks/mailgun
Events: delivered, bounced, complained
```

### Dashboard Recommendations

**Create custom dashboards:**

1. **Mailgun Dashboard:**
   - Real-time email delivery stats
   - Bounce/spam complaint graphs
   - Delivery time histogram

2. **PostHog Dashboard:**
   - Magic link conversion funnel (requested → sent → clicked → authenticated)
   - Authentication method breakdown (email vs. OAuth)
   - User registration/login trends

3. **Cloudflare Dashboard:**
   - Worker request volume
   - Error rates
   - Response times

---

## 3. Rollback Plan

### Rollback Scenarios

#### Scenario 1: Critical Email Delivery Failure

**Symptoms:**
- Magic link emails not being delivered
- Mailgun errors in logs
- Multiple user reports of missing emails
- Email delivery success rate < 80%

**Severity:** CRITICAL (users cannot sign in)

**Rollback Steps:**

1. **Immediate Action (5 minutes):**

   Re-enable Credentials provider as temporary fallback:

   ```bash
   # In apps/web/app/(auth)/auth.ts

   # 1. Add bcrypt import
   import { compare } from 'bcrypt-ts';

   # 2. Add Credentials provider back to providers array
   providers: [
     Google({ ... }),
     GitHub({ ... }),
     Email({ ... }),

     // Temporary fallback during email delivery issues
     Credentials({
       credentials: {},
       async authorize({ email, password }: any) {
         const users = await getUser(email);
         if (users.length === 0) return null;

         // Check if password exists (will be null for magic link users)
         if (!users[0]!.password) {
           // User signed up via magic link, no password set
           return null;
         }

         const passwordsMatch = await compare(password, users[0]!.password);
         if (!passwordsMatch) return null;

         return { ...users[0], provider: 'credentials' } as any;
       },
     }),
   ],
   ```

2. **Add bcrypt back (2 minutes):**

   ```bash
   cd /Users/ed/Code/brag-ai
   pnpm add bcrypt-ts
   ```

3. **Restore password form (10 minutes):**

   ```bash
   # Restore AuthForm component from git history
   git checkout [commit-before-phase-4] -- apps/web/components/auth-form.tsx

   # Restore server actions
   git checkout [commit-before-phase-4] -- apps/web/app/(auth)/actions.ts
   ```

4. **Update login/register pages (5 minutes):**

   Temporarily add AuthForm alongside MagicLinkAuthForm with a notice:

   ```tsx
   <div className="space-y-4">
     <MagicLinkAuthForm mode="login" />

     {/* Temporary fallback during email issues */}
     <div className="border-t pt-4">
       <p className="text-sm text-yellow-600 mb-2">
         ⚠️ Email delivery temporarily unavailable. Please use password login:
       </p>
       <AuthForm mode="login" />
     </div>
   </div>
   ```

5. **Deploy rollback (5 minutes):**

   ```bash
   pnpm build:web
   # Deploy to Cloudflare Workers
   ```

6. **Communicate (immediate):**

   Post in-app banner:
   ```
   "We're experiencing email delivery issues. Please use password login temporarily."
   ```

**Total Rollback Time:** ~30 minutes

**Impact:**
- Users with passwords can log in
- New magic link users cannot log in (no password set)
- OAuth providers unaffected

**Recovery:**
- Fix Mailgun issue (check credentials, quota, domain reputation)
- Test email delivery
- Remove temporary password login
- Re-deploy

#### Scenario 2: PostHog Aliasing Issues

**Symptoms:**
- Duplicate user identities in PostHog
- Anonymous events not merging with authenticated user
- `$create_alias` events not firing

**Severity:** LOW (authentication works, only tracking is affected)

**Impact:** Analytics only - no user-facing impact

**Response (no rollback needed):**

1. **Investigate:**
   - Check PostHog live events for `$create_alias`
   - Verify `ph_anonymous_id` cookie is being set
   - Check browser DevTools cookies

2. **Fix:**
   - Update `createUser` event in auth.ts
   - Add debug logging to track cookie values
   - Test aliasing flow

3. **Manual cleanup:**
   - If duplicate identities created, manually merge in PostHog

**No authentication rollback required.**

#### Scenario 3: Account Linking Failures

**Symptoms:**
- Users creating duplicate accounts when switching providers
- OAuth + magic link not linking to same account
- Database has multiple user records for same email

**Severity:** MEDIUM (data integrity issue)

**Impact:**
- User confusion (multiple accounts)
- Data fragmentation (achievements in different accounts)

**Response:**

1. **Investigate:**
   - Check Account table for duplicate userId entries
   - Verify NextAuth adapter configuration
   - Check email matching logic

2. **Fix:**
   - Verify Drizzle adapter is correctly configured
   - Ensure email normalization is consistent
   - Add logging to account linking

3. **Manual merge:**
   - Identify duplicate accounts in database
   - Manually merge data (achievements, projects, etc.)
   - Delete duplicate user records

**No authentication rollback required** - only affects users with multiple providers.

#### Scenario 4: Demo Account Authentication Broken

**Symptoms:**
- Demo mode completely non-functional
- Demo login fails with "Invalid credentials"
- Demo account creation fails

**Severity:** HIGH (feature broken)

**Impact:**
- Users cannot try app without signing up
- Marketing demo flow broken

**Status:** KNOWN ISSUE (documented in Phase 4)

**Long-term fix required:**
- Refactor demo accounts to use session tokens instead of passwords
- See Phase 4 documentation for details

**Temporary workaround:**
- Keep Credentials provider enabled ONLY for demo users
- Check user level before allowing credentials login
- Document this exception

### Rollback Decision Matrix

| Scenario | Severity | Rollback? | Time Estimate |
|----------|----------|-----------|---------------|
| Email delivery failure | CRITICAL | Yes | 30 minutes |
| PostHog aliasing issues | LOW | No | 1-2 hours to fix |
| Account linking failures | MEDIUM | No | Manual cleanup |
| Demo account broken | HIGH | No (separate fix) | 4-8 hours |
| OAuth providers broken | CRITICAL | Yes (restore OAuth) | 15 minutes |
| Database migration fails | CRITICAL | Yes (rollback DB) | 10 minutes |

### Emergency Contacts

**Who to notify during rollback:**
- Engineering lead
- Product owner
- Support team (to handle user inquiries)
- Marketing (if demo mode affected)

**Communication channels:**
- Slack: #engineering, #incidents
- Email: engineering@bragdoc.ai
- Status page: status.bragdoc.ai (if available)

---

## 4. Pre-Deployment Checklist

### Code Checklist

**Before deployment, verify:**

- [ ] **Magic link email template tested**
  - [ ] Email renders correctly in Gmail, Outlook, Yahoo
  - [ ] Mobile responsive
  - [ ] Links are clickable
  - [ ] Expiry time clearly stated

- [ ] **NextAuth Email provider configured**
  - [ ] SMTP credentials set in environment
  - [ ] Custom email sending function works
  - [ ] 24-hour token expiry configured
  - [ ] Verification token table exists

- [ ] **UI updated for magic links**
  - [ ] Password fields removed from login/register
  - [ ] MagicLinkAuthForm component tested
  - [ ] "Check your email" confirmation works
  - [ ] Error handling in place
  - [ ] ToS acceptance still required for registration

- [ ] **Credentials provider removed**
  - [ ] Provider removed from auth.ts
  - [ ] Server actions deleted (register/login)
  - [ ] AuthForm component deleted
  - [ ] bcrypt-ts dependency removed
  - [ ] No broken imports

- [ ] **PostHog aliasing updated**
  - [ ] `aliasUser` function added
  - [ ] Cookie-based aliasing in createUser event
  - [ ] Works for all providers (Email, Google, GitHub)
  - [ ] Cookie cleanup after aliasing

- [ ] **OAuth providers still work**
  - [ ] Google OAuth tested
  - [ ] GitHub OAuth tested
  - [ ] `allowDangerousEmailAccountLinking: true` configured for Google and GitHub
  - [ ] 🔴 **CRITICAL:** Account linking tested (OAuth + magic link)
    - [ ] Test: Create account with magic link → Sign in with Google (same email) → Verify same user ID
    - [ ] Test: Create account with GitHub → Sign in with magic link (same email) → Verify same user ID
    - [ ] Verify no duplicate accounts created
    - [ ] Verify user data preserved across providers

- [ ] **TypeScript compilation successful**
  - [ ] `pnpm build:web` passes
  - [ ] No type errors
  - [ ] No import errors

- [ ] **All tests passing**
  - [ ] See TEST-REPORT.md for comprehensive test list
  - [ ] Critical path tests completed
  - [ ] Security tests completed

### Infrastructure Checklist

**Before deployment, verify:**

- [ ] **Production environment variables set**
  - [ ] MAILGUN_SMTP_SERVER configured
  - [ ] MAILGUN_SMTP_LOGIN configured
  - [ ] MAILGUN_SMTP_PASSWORD configured (secret)
  - [ ] NEXTAUTH_URL correct
  - [ ] AUTH_SECRET set (strong random string)
  - [ ] OAuth credentials verified (Google, GitHub)
  - [ ] PostHog key verified

- [ ] **Mailgun configuration verified**
  - [ ] SMTP credentials tested (send test email)
  - [ ] Domain verified and active
  - [ ] Sender reputation good (no spam flags)
  - [ ] Email deliverability tested (Gmail, Outlook, Yahoo)
  - [ ] Webhooks configured (optional but recommended)

- [ ] **Monitoring configured**
  - [ ] Mailgun dashboard access
  - [ ] PostHog dashboard configured
  - [ ] Cloudflare Workers logs accessible
  - [ ] Alert thresholds set

- [ ] **Alerts set up**
  - [ ] Email delivery success rate < 95%
  - [ ] Authentication error rate > 5%
  - [ ] Mailgun bounce rate spike
  - [ ] Mailgun spam complaint spike

- [ ] **Rollback plan documented**
  - [ ] This DEPLOYMENT.md reviewed
  - [ ] Team aware of rollback procedures
  - [ ] Emergency contacts identified

- [ ] **Team notified**
  - [ ] Engineering team aware of deployment
  - [ ] Support team prepared for user questions
  - [ ] Marketing aware (if demo mode affected)

### Documentation Checklist

**Before deployment, verify:**

- [ ] **CLAUDE.md updated**
  - [ ] Authentication section reflects magic links
  - [ ] OAuth providers documented
  - [ ] Credentials provider removal noted

- [ ] **Technical docs updated**
  - [ ] `.claude/docs/tech/authentication.md` updated
  - [ ] Magic link flow documented
  - [ ] PostHog aliasing documented
  - [ ] Frontend patterns documented

- [ ] **API docs verified**
  - [ ] `.claude/docs/tech/api-conventions.md` still accurate
  - [ ] getAuthUser helper unchanged

- [ ] **Test report created**
  - [ ] TEST-REPORT.md exists
  - [ ] All tests documented
  - [ ] Test results recorded

- [ ] **Deployment plan documented**
  - [ ] This DEPLOYMENT.md complete
  - [ ] All sections filled out
  - [ ] Known issues documented

### Deployment Checklist

**Deployment steps:**

- [ ] **Database migration ready** (if Phase 6 completed)
  - [ ] Migration file generated
  - [ ] Migration tested in staging
  - [ ] Rollback migration available

- [ ] **Code merged to production branch**
  - [ ] All phases complete (1-5, 7-8)
  - [ ] Code reviewed
  - [ ] Tests passing
  - [ ] No merge conflicts

- [ ] **Build successful**
  - [ ] `pnpm build:web` passes
  - [ ] No build errors
  - [ ] No warnings (or warnings reviewed)

- [ ] **Staging deployment successful**
  - [ ] Deployed to staging environment
  - [ ] Smoke tests pass in staging
  - [ ] Magic links work in staging
  - [ ] OAuth works in staging
  - [ ] No errors in staging logs

- [ ] **Staging smoke tests pass**
  - [ ] New user signup via magic link
  - [ ] Existing user login via magic link
  - [ ] Google OAuth login
  - [ ] GitHub OAuth login
  - [ ] Email delivery time < 30 seconds
  - [ ] No errors in logs

- [ ] **Production deployment scheduled**
  - [ ] Deployment time chosen (low traffic period)
  - [ ] Team availability confirmed
  - [ ] Rollback plan ready
  - [ ] Monitoring prepared

- [ ] **Communication plan ready**
  - [ ] Internal team notified
  - [ ] Support team briefed
  - [ ] User communication prepared (if needed)

### Critical Blockers

**DO NOT DEPLOY if:**

- ❌ **Email delivery not tested** - Must test with real email providers first
- ❌ **SMTP credentials not configured** - Magic links will fail completely
- ❌ **OAuth providers broken** - Users with Google/GitHub accounts locked out
- ❌ **Build failing** - Deployment will fail
- ❌ **Staging tests failing** - Production will also fail
- ⚠️ **Demo account issue not addressed** - Demo mode will be broken (HIGH priority)

---

## 5. Communication Plan

### Internal Team Communication

**Who to notify:**
- Engineering team
- Product team
- Support team
- Marketing team (if demo mode affected)

**When to notify:**
- 24 hours before deployment (heads up)
- 1 hour before deployment (final notice)
- During deployment (status updates)
- After deployment (completion notice)

#### Pre-Deployment Notification (24 hours before)

**Subject:** Magic Link Authentication Deployment - [Date] at [Time]

**Message:**

```
Hi team,

We're deploying passwordless magic link authentication on [Date] at [Time].

WHAT'S CHANGING:
- Email/password login will be removed
- Magic link login added (no password needed)
- OAuth (Google, GitHub) remains unchanged
- Existing users can log in with magic links (same accounts)

USER IMPACT:
- No passwords required anymore
- Users receive email with sign-in link
- Links expire after 24 hours
- Faster, more secure authentication

WHAT TO WATCH:
- Email delivery: Monitor Mailgun dashboard
- Auth metrics: Check PostHog for login/signup events
- Error logs: Watch Cloudflare Workers logs
- User reports: Support tickets about login issues

KNOWN ISSUES:
- Demo mode will be broken (fix in progress)
- Users who signed up with magic links have no password (expected)

ROLLBACK PLAN:
- Credentials provider can be re-added if email delivery fails
- Rollback time: ~30 minutes
- No data loss (password hashes still in database if Phase 6 not completed)

SUPPORT GUIDANCE:
- Users asking about passwords: "We've switched to passwordless magic links for better security"
- Missing emails: Check spam folder, request new magic link
- Email delivery > 1 minute: Escalate to engineering

DEPLOYMENT WINDOW:
- Start: [Date] at [Time]
- Expected duration: 15 minutes
- Monitoring period: 1 hour after deployment

EMERGENCY CONTACTS:
- Engineering lead: [Name/Contact]
- On-call engineer: [Name/Contact]

Thanks for your attention! Please reach out with any questions.

[Your Name]
```

#### During Deployment Updates

**Status update template:**

```
Deployment Status - Magic Link Auth

[Time] - Deployment started
[Time] - Build complete
[Time] - Deployed to Cloudflare Workers
[Time] - Smoke tests started
[Time] - Smoke tests passed
[Time] - Monitoring in progress
[Time] - Deployment complete

Current status: [In Progress / Complete / Rolling Back]
Issues: [None / List issues]
```

#### Post-Deployment Notification

**Subject:** Magic Link Authentication Deployment - COMPLETE

**Message:**

```
Hi team,

Magic link authentication deployment is complete!

DEPLOYMENT SUMMARY:
- Deployed at: [Time]
- Duration: [X] minutes
- Status: Successful
- Issues encountered: [None / List issues]

CURRENT STATUS:
- Magic link authentication: ✅ Working
- Google OAuth: ✅ Working
- GitHub OAuth: ✅ Working
- Email delivery: ✅ Averaging [X] seconds
- Error rate: [X]%

MONITORING:
- Mailgun dashboard: [Link]
- PostHog events: [Link]
- Cloudflare logs: [Link]

KNOWN ISSUES:
- Demo mode: Still broken (fix scheduled for [Date])

NEXT STEPS:
- Continue monitoring for 24 hours
- Address any user reports promptly
- Review metrics tomorrow

Please report any issues immediately in #incidents.

Thanks!
```

### User Communication (Optional)

#### In-App Banner (Optional)

If you want to notify users proactively about the change:

**Banner text:**
```
✨ New: Passwordless login! No more passwords to remember - just check your email for a magic link.
```

**Placement:** Top of login and register pages

**Duration:** 7 days after deployment

#### Email to Active Users (Optional - Not Recommended)

**Subject:** Simpler, More Secure Login to BragDoc

**Body:**

```
Hi [Name],

We've made signing in to BragDoc even easier!

We've switched to passwordless magic links - just enter your email and we'll send you a secure link to sign in. No password to remember!

What this means for you:
✅ Faster sign in (no password to type)
✅ More secure (no passwords to leak)
✅ No forgotten password hassles

Next time you sign in:
1. Enter your email address
2. Click the link in your email
3. You're in!

Your account and all your achievements are exactly as you left them.

Questions? Reply to this email or visit our help center.

Best,
The BragDoc Team
```

**Note:** This email is optional. Most users won't notice the change and will adapt naturally. Only send if you expect confusion.

### Support Team Briefing

**Topics to cover:**

1. **What changed:**
   - No more password login
   - Magic link login replaces it
   - OAuth unchanged

2. **Common user questions:**
   - "Where's the password field?" → "We use magic links now - check your email"
   - "I didn't get the email" → "Check spam, or request a new link"
   - "The link doesn't work" → "Links expire after 24 hours, request a new one"
   - "What if I have a password?" → "You don't need it anymore, just use magic links"

3. **How to help users:**
   - Request new magic link: Visit /login, enter email
   - Check spam folder
   - Verify email address is correct
   - Try different email provider if issues persist

4. **When to escalate:**
   - Email delivery > 2 minutes
   - Multiple users reporting same issue
   - Magic links not working at all
   - OAuth login broken

5. **Known issues:**
   - Demo mode broken (acknowledged, fix in progress)

**Provide:**
- Link to this DEPLOYMENT.md
- Link to TEST-REPORT.md
- Screenshots of new login/register flow
- FAQ document

---

## 6. Post-Deployment Verification

### Immediate Verification (Within 15 Minutes)

**Critical tests to perform immediately after deployment:**

#### Test 1: New User Signup via Magic Link

**Steps:**
1. Visit https://www.bragdoc.ai/register
2. Enter NEW email address: `test+magiclink-[timestamp]@yourdomain.com`
3. Accept Terms of Service
4. Click "Continue with email"
5. Verify "Check your email" message appears
6. Check email inbox
7. Click magic link
8. Verify redirect to /dashboard
9. Verify user is authenticated (see user menu)
10. Check database for new user record

**Expected results:**
- ✅ Email received within 30 seconds
- ✅ Email subject: "Welcome to BragDoc!"
- ✅ Magic link works
- ✅ User authenticated
- ✅ New user created in database
- ✅ Welcome email sent

**If failed:** CRITICAL - investigate immediately, consider rollback.

#### Test 2: Existing User Login via Magic Link

**Steps:**
1. Log out
2. Visit https://www.bragdoc.ai/login
3. Enter EXISTING email address (from Test 1)
4. Click "Send magic link"
5. Check email inbox
6. Click magic link
7. Verify redirect to /dashboard
8. Verify same user ID (check database or user menu)

**Expected results:**
- ✅ Email received within 30 seconds
- ✅ Email subject: "Sign in to BragDoc"
- ✅ Email says "Sign in" (not "Welcome")
- ✅ Same user ID as Test 1
- ✅ No new user created

**If failed:** CRITICAL - investigate immediately, consider rollback.

#### Test 3: Google OAuth

**Steps:**
1. Log out
2. Visit https://www.bragdoc.ai/login
3. Click "Sign in with Google"
4. Complete OAuth flow
5. Verify redirect to /dashboard
6. Verify user authenticated

**Expected results:**
- ✅ OAuth flow works
- ✅ User authenticated
- ✅ No errors

**If failed:** CRITICAL - OAuth providers must work.

#### Test 4: GitHub OAuth

**Steps:**
1. Log out
2. Visit https://www.bragdoc.ai/login
3. Click "Sign in with GitHub"
4. Complete OAuth flow
5. Verify redirect to /dashboard
6. Verify user authenticated

**Expected results:**
- ✅ OAuth flow works
- ✅ User authenticated
- ✅ No errors

**If failed:** CRITICAL - OAuth providers must work.

#### Test 5: Check Monitoring

**Check these dashboards:**

1. **Mailgun Dashboard:**
   - Navigate to Sending → Logs
   - Verify test emails appear
   - Check delivery status: "delivered"
   - Check delivery time: < 30 seconds

2. **PostHog Events:**
   - Navigate to Activity
   - Check for `user_registered` event (Test 1)
   - Check for `user_logged_in` event (Test 2)
   - Verify event properties are correct

3. **Cloudflare Workers Logs:**
   - Navigate to Workers → Your Worker → Logs
   - Check for any errors during tests
   - Verify requests are successful (200 status codes)

**Expected results:**
- ✅ All emails show "delivered" status
- ✅ PostHog events firing correctly
- ✅ No errors in Cloudflare logs

**If failed:** Investigate logging/monitoring issues.

#### Test 6: Error Scenarios

**Test expired token:**
1. Request magic link
2. Wait 25 hours (or manually expire token in database)
3. Click link
4. Verify error message: "Token expired" or similar

**Test reused token:**
1. Request magic link
2. Click link (successfully logs in)
3. Copy link URL
4. Log out
5. Visit copied link again
6. Verify error message: "Token already used" or similar

**Expected results:**
- ✅ Expired tokens show clear error
- ✅ Reused tokens show clear error
- ✅ Users can request new link

**If failed:** Error handling needs improvement (not critical for deployment).

### 1-Hour Monitoring Period

**After immediate tests pass, monitor for 1 hour:**

**Watch these metrics:**

1. **Authentication success rate**
   - Target: > 95%
   - Check: PostHog events, Cloudflare logs
   - Alert if: < 90%

2. **Email delivery rate**
   - Target: > 95%
   - Check: Mailgun dashboard
   - Alert if: < 90%

3. **Error rate**
   - Target: < 5%
   - Check: Cloudflare Workers logs
   - Alert if: > 10%

4. **User reports**
   - Target: 0 critical issues
   - Check: Support tickets, social media
   - Alert if: Multiple users reporting same issue

**Actions during monitoring:**
- Refresh dashboards every 5 minutes
- Watch Slack/email for user reports
- Check error logs for anomalies
- Be ready to rollback if critical issues arise

**If all metrics are healthy after 1 hour:** Deployment successful! Continue with 24-hour monitoring.

### 24-Hour Post-Deployment Review

**One day after deployment, review:**

#### Authentication Metrics

**Collect from PostHog:**
- Total signups (last 24 hours)
- Total logins (last 24 hours)
- Breakdown by method (email, Google, GitHub)
- Authentication success rate
- Error rate

**Target metrics:**
- Signups: Similar to historical average
- Logins: Similar to historical average
- Success rate: > 95%
- Error rate: < 5%

**Red flags:**
- Signup rate dropped significantly
- High error rate
- Skewed provider distribution (too many OAuth, too few email)

#### Email Delivery Metrics

**Collect from Mailgun:**
- Total magic link emails sent
- Delivery success rate
- Average delivery time
- Bounce rate
- Spam complaint rate

**Target metrics:**
- Success rate: > 95%
- Avg delivery time: < 30 seconds
- Bounce rate: < 2%
- Spam complaints: < 0.1%

**Red flags:**
- Low success rate
- High delivery time
- Increased bounces
- Spam complaints

#### Magic Link Engagement

**Collect from database/PostHog:**
- Magic links clicked (vs. sent)
- Average time from sent to clicked
- Expired link rate

**Target metrics:**
- Click-through rate: > 80%
- Median time to click: < 5 minutes
- Expired rate: < 5%

**Red flags:**
- Low click-through rate (users not clicking links)
- High expired rate (24-hour expiry too short?)

#### User Feedback

**Check support channels:**
- Support tickets about login issues
- Social media mentions
- In-app feedback

**Questions to answer:**
- Are users confused by magic links?
- Are there email delivery issues?
- Are links not working?
- Are there any edge cases we missed?

**Red flags:**
- Multiple users confused about passwordless login
- Complaints about email delivery
- Reports of non-working links

#### PostHog Aliasing Verification

**Check PostHog dashboard:**
1. Find a user who signed up in last 24 hours
2. View their event stream
3. Check for:
   - Anonymous events BEFORE signup
   - `$create_alias` event at signup
   - All events under single user identity
   - No duplicate identities

**Expected:**
- ✅ Anonymous events merged with user
- ✅ `$create_alias` fired
- ✅ Single user identity

**Red flags:**
- Duplicate user identities
- Anonymous events not merged
- No `$create_alias` events

#### Database Health Check

**Run these queries:**

1. **New users created (last 24 hours):**
   ```sql
   SELECT COUNT(*) FROM "User"
   WHERE "created_at" > NOW() - INTERVAL '24 hours';
   ```

2. **Users by authentication provider:**
   ```sql
   SELECT provider, COUNT(*)
   FROM "User"
   WHERE "created_at" > NOW() - INTERVAL '24 hours'
   GROUP BY provider;
   ```

3. **Account linking check (users with multiple providers):**
   ```sql
   SELECT "userId", COUNT(*) as provider_count
   FROM "Account"
   GROUP BY "userId"
   HAVING COUNT(*) > 1;
   ```

4. **Duplicate accounts (same email, different userId):**
   ```sql
   SELECT email, COUNT(*) as count
   FROM "User"
   GROUP BY email
   HAVING COUNT(*) > 1;
   ```

**Expected results:**
- New user count similar to historical average
- Provider distribution makes sense
- Account linking works (some users have > 1 provider)
- No duplicate accounts (different userId, same email)

**Red flags:**
- Duplicate accounts created
- Account linking failures
- Anomalous provider distribution

### 7-Day Post-Deployment Review

**One week after deployment:**

#### Performance Review

**Metrics to review:**
1. **Cumulative authentication success rate (7 days)**
2. **Email delivery success rate (7 days)**
3. **Magic link click-through rate (7 days)**
4. **User retention (compare to pre-deployment)**
5. **Support ticket volume (login-related)**

**Questions to answer:**
- Is magic link authentication performing as expected?
- Are users adapting well to passwordless login?
- Are there any persistent issues?
- Should we adjust token expiry time?

#### Go/No-Go Decision for Phase 6 (Database Cleanup)

**If all metrics are healthy and stable for 7 days:**
- ✅ Consider executing Phase 6 (remove password column)
- ✅ Simplify rollback plan (no credentials provider needed)
- ✅ Remove temporary monitoring

**If issues persist:**
- ❌ Defer Phase 6 indefinitely
- ❌ Keep password column as rollback buffer
- ❌ Continue monitoring

#### Update Documentation

**After 7 days of stability:**
1. Update rollback plan (can simplify if Phase 6 completed)
2. Archive temporary monitoring dashboards
3. Document lessons learned
4. Update team processes

---

## 7. Known Issues and Blockers

### Critical Blocker: Demo Account Authentication Broken

**Status:** KNOWN ISSUE (documented in Phase 4)

**Severity:** HIGH

**Impact:**
- Demo mode completely non-functional
- Demo login fails with "Invalid credentials" error
- Demo account creation fails
- Users cannot try app without signing up
- Marketing demo flow broken

**Root Cause:**
- Demo accounts rely on Credentials provider (removed in Phase 4)
- Demo account creation generates password and hashes it with bcrypt-ts
- Demo login uses `signIn('credentials', { email, password })`
- Both bcrypt-ts and Credentials provider are removed

**Affected Code:**
- `/Users/ed/Code/brag-ai/apps/web/lib/create-demo-account.ts`
- `/Users/ed/Code/brag-ai/apps/web/app/(auth)/demo/actions.ts`

**Possible Solutions:**

#### Option 1: Keep Credentials Provider ONLY for Demo Accounts (Quick Fix)

**Pros:**
- Fast implementation (~2 hours)
- Minimal changes
- Demo mode works immediately

**Cons:**
- Credentials provider still in codebase
- bcrypt-ts dependency required
- Inconsistent auth architecture
- Passwords still in database (demo users only)

**Implementation:**
```typescript
// In auth.ts
Credentials({
  credentials: {},
  async authorize({ email, password }: any) {
    const users = await getUser(email);
    if (users.length === 0) return null;

    // Only allow credentials for demo users
    if (users[0]!.level !== 'demo') {
      return null;
    }

    if (!users[0]!.password) return null;
    const passwordsMatch = await compare(password, users[0]!.password);
    if (!passwordsMatch) return null;

    return { ...users[0], provider: 'credentials' } as any;
  },
}),
```

#### Option 2: Refactor Demo Accounts to Use Session Tokens (Proper Fix)

**Pros:**
- Clean architecture (no passwords)
- Consistent with magic link approach
- More secure
- No bcrypt-ts dependency

**Cons:**
- More complex implementation (~8 hours)
- Requires custom NextAuth logic
- Need to test thoroughly

**Implementation approach:**
1. Remove password from demo account creation
2. Generate a JWT session token for demo user
3. Auto-login via custom callback instead of credentials
4. Store demo session token in database for cleanup
5. Set short expiry (24 hours) for demo accounts

#### Option 3: Remove Demo Mode Entirely (Breaking Change)

**Pros:**
- Simplest solution
- Clean removal of problematic feature
- Forces users to sign up (better engagement)

**Cons:**
- Removes marketing feature
- Can't try before signup
- May reduce conversions

**Recommendation:** NOT RECOMMENDED - demo mode is valuable for marketing.

### Recommended Approach

**For deployment:** Option 1 (Quick Fix)
- Implement before production deployment
- Minimal risk, fast turnaround
- Allows demo mode to continue functioning

**Post-deployment:** Refactor to Option 2 (Proper Fix)
- Schedule as separate task
- Implement proper session-based demo accounts
- Remove Credentials provider entirely
- Clean up architecture

### Other Known Issues

**None at this time.**

All other aspects of the magic link authentication migration are functioning as expected.

---

## Conclusion

This deployment guide provides comprehensive information for deploying magic link authentication to production. Key points:

**Ready for deployment:**
- ✅ Code implementation complete (Phases 1-5, 7-8)
- ✅ Documentation updated and accurate
- ✅ Test report created with comprehensive test cases
- ✅ Rollback plan documented
- ✅ Monitoring strategy defined

**Before deploying:**
- ⚠️ **Configure Mailgun SMTP credentials** (CRITICAL)
- ⚠️ **Fix demo account authentication** (HIGH PRIORITY)
- ⚠️ **Complete testing with real email delivery** (CRITICAL)
- ⚠️ **Test in staging environment** (CRITICAL)

**Post-deployment:**
- Monitor email delivery for 24 hours
- Watch authentication success rates
- Review PostHog aliasing
- Address user feedback
- Consider Phase 6 (database cleanup) after 7 days of stability

**Blockers:**
- Demo account authentication must be fixed before production deployment
- SMTP credentials must be configured and tested

**Estimated time to production-ready:** 4-8 hours
- Configure SMTP: 30 minutes
- Fix demo accounts: 2-4 hours
- Complete testing: 2-4 hours

---

**Document Version:** 1.0
**Last Updated:** 2025-10-26
**Status:** Complete and ready for review
