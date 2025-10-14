# Feature Configuration

BragDoc supports flexible feature configuration to work in both open source and commercial environments.

## Payment Gating System

BragDoc uses the `PAYMENT_TOKEN_REQUIRED` environment variable to control feature availability:

### Open Source Mode (Default)
```bash
PAYMENT_TOKEN_REQUIRED=false  # or unset
```
- **All features available** to all users
- **No payment integration** required
- Perfect for self-hosting and open source deployment

### Commercial Mode
```bash
PAYMENT_TOKEN_REQUIRED=true
```
- **Feature gating** based on subscription levels
- **Stripe integration** for payment processing
- Requires additional Stripe environment variables

## Feature Gates

When payment is required (`PAYMENT_TOKEN_REQUIRED=true`), features are gated by user subscription level:

### Free Tier Features
- ✅ Basic achievement tracking
- ✅ Manual achievement creation
- ✅ Basic document export
- ✅ Profile management
- ❌ Limited to 10 achievements per month

### Basic Tier Features ($9/month)
- ✅ **All Free Tier features**
- ✅ **Unlimited achievements**
- ✅ **Email integration** for automatic tracking
- ✅ **GitHub integration** for commit tracking
- ✅ **Document templates**
- ✅ **Basic analytics**

### Pro Tier Features ($19/month)
- ✅ **All Basic Tier features**  
- ✅ **AI-powered assistance** for achievement writing
- ✅ **Advanced analytics** and insights
- ✅ **Team collaboration** features
- ✅ **API access** for integrations
- ✅ **Priority support**

## Feature Implementation

The payment gating system is implemented through the `@bragdoc/config` package:

```typescript
// Check if payment is required globally
import { isPaymentRequired } from '@bragdoc/config'

if (isPaymentRequired()) {
  // Commercial mode - check user subscription
} else {
  // Open source mode - all features available
}
```

```typescript  
// Check specific feature access
import { requiresPayment } from '@bragdoc/config'

if (requiresPayment(user.level, 'ai_assistant')) {
  // Show upgrade prompt
} else {
  // Feature available
}
```

## Feature Flag Reference

| Feature Gate | Free | Basic | Pro | Description |
|--------------|------|-------|-----|-------------|
| `unlimited_documents` | ❌ | ✅ | ✅ | Create unlimited achievements and documents |
| `ai_assistant` | ❌ | ❌ | ✅ | AI-powered writing assistance |  
| `advanced_analytics` | ❌ | ❌ | ✅ | Detailed insights and reporting |
| `team_collaboration` | ❌ | ❌ | ✅ | Share and collaborate with team members |
| `api_access` | ❌ | ❌ | ✅ | REST API for integrations |
| `email_integration` | ❌ | ✅ | ✅ | Automatic achievement tracking via email |
| `github_integration` | ❌ | ✅ | ✅ | Track achievements from Git commits |

## Self-Hosting Options

### Option 1: Full Open Source
```bash  
# No payment variables set
PAYMENT_TOKEN_REQUIRED=false
```
- **Best for**: Personal use, internal teams, open source projects
- **Features**: All features available to all users
- **Payment**: No payment processing

### Option 2: Commercial Self-Hosted
```bash
PAYMENT_TOKEN_REQUIRED=true
STRIPE_SECRET_KEY=sk_live_...
STRIPE_PUBLISHABLE_KEY=pk_live_...
```
- **Best for**: Companies wanting to monetize their deployment
- **Features**: Full subscription management with Stripe
- **Payment**: Stripe integration required

### Option 3: Hybrid Mode
```bash
PAYMENT_TOKEN_REQUIRED=true
# Customize feature gates in @bragdoc/config
```
- **Best for**: Custom feature restrictions
- **Features**: Define your own feature availability logic
- **Payment**: Optional Stripe integration

## Customizing Feature Gates

You can customize feature availability by modifying `packages/config/src/payment-gates.ts`:

```typescript
export const featureGates: Record<FeatureGate, UserLevel[]> = {
  unlimited_documents: ['basic', 'pro'],
  ai_assistant: ['pro'],
  // Add custom gates
  custom_feature: ['free', 'basic', 'pro'], // Available to all
  premium_feature: ['pro'], // Pro only
}
```

## Middleware Protection

The web app includes middleware that automatically protects routes based on feature gates:

```typescript
// In apps/web/src/middleware.ts
const protectedRoutes: Record<string, string> = {
  '/chat': 'unlimited_documents',
  '/api/ai': 'ai_assistant', 
  '/settings/integrations': 'api_access',
}
```

When `PAYMENT_TOKEN_REQUIRED=true`:
- Users without access are redirected to upgrade page
- Features are hidden in the UI
- API endpoints return 403 for unauthorized features

When `PAYMENT_TOKEN_REQUIRED=false`:
- All routes are accessible
- No payment checks performed
- All features visible in UI

## Component-Level Gates

Use feature gates in React components:

```tsx
import { requiresPayment } from '@bragdoc/config'

function AIAssistantButton({ user }) {
  if (requiresPayment(user.level, 'ai_assistant')) {
    return <UpgradePrompt feature="AI Assistant" />
  }
  
  return <AIAssistantDialog />
}
```

## Environment-Based Configuration

Different environments can have different feature availability:

```bash
# Development - all features available
PAYMENT_TOKEN_REQUIRED=false

# Staging - test payment flows  
PAYMENT_TOKEN_REQUIRED=true
STRIPE_SECRET_KEY=sk_test_...

# Production - live payments
PAYMENT_TOKEN_REQUIRED=true
STRIPE_SECRET_KEY=sk_live_...
```

## Migration Between Modes

You can change between open source and commercial modes:

### From Open Source to Commercial
1. Set `PAYMENT_TOKEN_REQUIRED=true`
2. Configure Stripe keys
3. Existing users get "free" level by default
4. Features become gated based on subscription

### From Commercial to Open Source  
1. Set `PAYMENT_TOKEN_REQUIRED=false`
2. Remove Stripe configuration
3. All features become available to all users
4. Subscription data preserved but not enforced

## Best Practices

1. **Test both modes** during development
2. **Document feature availability** for your users
3. **Graceful degradation** when features are unavailable
4. **Clear upgrade prompts** with feature benefits
5. **Consistent UI/UX** across feature tiers

This flexible system allows BragDoc to serve both open source communities and commercial deployments with the same codebase.