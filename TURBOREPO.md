# BragDoc Turborepo Migration Plan

## Current Architecture Analysis

### Existing Structure
The BragDoc project is currently a single Next.js application using App Router with route groups:

- **`app/(app)/`** - Main application (achievements, chat, companies, documents, projects, settings)
- **`app/(marketing)/`** - Marketing pages (landing, pricing, blog, about pages) 
- **`app/(auth)/`** - Authentication (login, register, auth config)
- **`cli/`** - CLI tool (already a separate package with its own package.json)
- **`components/`** - Shared UI components (app-specific and marketing components)
- **`lib/`** - Shared utilities (database, auth, AI, email, stripe, etc.)

### Key Dependencies & Integrations
- **Authentication**: NextAuth.js with Google, GitHub, and credentials providers
- **Database**: Drizzle ORM with PostgreSQL (user levels: free, basic, pro)
- **Payments**: Stripe integration with subscription plans
- **AI**: Multiple LLM providers (OpenAI, Google, etc.)
- **Styling**: Tailwind CSS with shadcn/ui components
- **CLI**: Standalone package with authentication flow

### Current Payment Gating
The system already has subscription levels implemented:
- User schema includes `level` (free/basic/pro) and `renewalPeriod` (monthly/yearly)
- Stripe integration for payment processing
- Plans defined in `lib/plans.ts` with feature differentiation

## Proposed Turborepo Architecture

### Target Structure
```
bragdoc-ai/
├── apps/
│   ├── web/                    # Main application (app/(app) + app/(auth))
│   └── marketing/              # Marketing site (app/(marketing))
├── packages/
│   ├── cli/                    # CLI tool (existing)
│   ├── ui/                     # Shared UI components
│   ├── database/               # Database schemas and queries
│   ├── auth/                   # Authentication utilities
│   ├── email/                  # Email utilities
│   └── config/                 # Shared configurations
├── turbo.json
└── package.json
```

### App Splitting Strategy

**Two Apps Architecture (Selected)**
- **`apps/web`** - Main application including authentication (app/(app) + app/(auth))
- **`apps/marketing`** - Public marketing site (app/(marketing))

This approach keeps authentication tightly coupled with the main application, which makes sense given:
- Auth state is primarily used within the main app
- Simpler deployment and development workflow
- Easier session management and middleware configuration
- Better suited for the current team size and complexity

## Payment Gating Architecture

### Environment Variable Strategy
```bash
# Production environment
PAYMENT_TOKEN_REQUIRED=true

# Development/Open Source
PAYMENT_TOKEN_REQUIRED=false # or unset
```

### Implementation Approach

#### 1. Shared Payment Service (`packages/auth/payment.ts`)
```typescript
export const isPaymentRequired = (): boolean => {
  return process.env.PAYMENT_TOKEN_REQUIRED === 'true';
};

export const requiresPayment = (userLevel: UserLevel, feature: string): boolean => {
  if (!isPaymentRequired()) return false;
  
  // Define feature gates based on user level
  const featureGates = {
    'unlimited_usage': ['basic', 'pro'],
    'git_integration': ['basic', 'pro'],
    'multiple_repos': ['pro'],
    // ... other features
  };
  
  return !featureGates[feature]?.includes(userLevel);
};
```

#### 2. Middleware Protection (`apps/web/middleware.ts`)
```typescript
export function middleware(request: NextRequest) {
  // Only enforce payment gates if PAYMENT_TOKEN_REQUIRED is true
  if (isPaymentRequired()) {
    // Check user session and subscription status
    // Redirect to upgrade page if needed
  }
  
  return NextResponse.next();
}
```

#### 3. Component-Level Gates
```typescript
// In React components
if (requiresPayment(user.level, 'git_integration')) {
  return <UpgradePrompt feature="Git Integration" />;
}
```

## Step-by-Step Migration Plan

### Phase 1: Setup Turborepo Infrastructure
1. **Initialize Turborepo**
   ```bash
   pnpm add -D turbo
   ```

2. **Create `turbo.json`**
   ```json
   {
     "$schema": "https://turbo.build/schema.json",
     "tasks": {
       "build": {
         "dependsOn": ["^build"],
         "outputs": [".next/**", "!.next/cache/**", "dist/**"]
       },
       "dev": {
         "cache": false,
         "persistent": true
       },
       "lint": {},
       "test": {
         "dependsOn": ["^build"]
       }
     }
   }
   ```

3. **Update root `package.json`**
   ```json
   {
     "scripts": {
       "build": "turbo build",
       "dev": "turbo dev",
       "lint": "turbo lint",
       "test": "turbo test"
     },
     "workspaces": ["apps/*", "packages/*"]
   }
   ```

### Phase 2: Extract Shared Packages
1. **Create `packages/ui`**
   - Move shared components from `components/ui/`
   - Export as reusable package

2. **Create `packages/database`**
   - Move `lib/db/` contents
   - Include schemas, queries, and migrations

3. **Create `packages/auth`**
   - Move authentication utilities
   - Include payment gating logic

4. **Create `packages/email`**
   - Move `lib/email/` contents

5. **Create `packages/config`**
   - Shared TypeScript, ESLint, and Tailwind configurations

### Phase 3: Split Applications
1. **Create `apps/web`**
   - Move `app/(app)/` and `app/(auth)/` contents
   - Update imports to use workspace packages
   - Implement payment gating middleware
   - Configure to use shared packages
   - Maintain existing auth flow and session management

2. **Create `apps/marketing`**
   - Move `app/(marketing)/` contents
   - Separate marketing-specific components
   - Lightweight build focused on SEO and performance

3. **Move CLI** (already separate, minimal changes)
   - Update to `packages/cli/`
   - Ensure compatibility with new auth package

### Phase 4: Configure Deployment & Environment Management

#### Development Setup
```bash
# Root package.json scripts
"dev": "turbo dev",
"dev:web": "turbo dev --filter=web",
"dev:marketing": "turbo dev --filter=marketing"
```

#### Production Deployment Options
1. **Vercel (Recommended)**
   - Deploy each app separately
   - Use Vercel's monorepo support
   - Separate domains: `app.bragdoc.ai`, `bragdoc.ai`

2. **Single Deployment**
   - Use Next.js rewrites to serve both apps
   - More complex but single deployment target

#### Environment Variables
```bash
# Shared across apps
DATABASE_URL=
STRIPE_SECRET_KEY=
NEXTAUTH_SECRET=

# App-specific
PAYMENT_TOKEN_REQUIRED=true  # Production only

# Marketing app
NEXT_PUBLIC_APP_URL=https://app.bragdoc.ai

# Web app  
NEXT_PUBLIC_MARKETING_URL=https://bragdoc.ai
```

### Phase 5: Open Source Configuration

#### For Open Source Distribution
1. **Default Configuration**
   - `PAYMENT_TOKEN_REQUIRED` defaults to `false`
   - All features available without payment
   - Clear documentation for self-hosting

2. **Optional Payment Integration**
   - Self-hosters can optionally configure Stripe
   - Payment gating only activates when properly configured

3. **Feature Flags**
   ```typescript
   // packages/config/features.ts
   export const FEATURES = {
     paymentRequired: process.env.PAYMENT_TOKEN_REQUIRED === 'true',
     stripeEnabled: !!process.env.STRIPE_SECRET_KEY,
     // ... other feature flags
   };
   ```

## Benefits of This Architecture

### For Development
- **Faster builds** - Only rebuild changed applications
- **Clear separation of concerns** - Marketing vs. app logic
- **Shared code reuse** - No duplication of UI components or utilities
- **Independent deployments** - Deploy marketing changes without affecting app

### For Open Source
- **Easy self-hosting** - Clear separation between payment-required and free features
- **Flexible deployment** - Can deploy all apps or just specific ones
- **Transparent architecture** - Clear boundaries between services

### For Production
- **Scalability** - Can scale marketing and app independently
- **Performance** - Marketing site optimized separately
- **Team productivity** - Different teams can work on different apps

## Migration Timeline

### Week 1: Infrastructure Setup
- [ ] Initialize Turborepo
- [ ] Create basic package structure
- [ ] Set up shared configurations

### Week 2: Package Extraction
- [ ] Extract UI components
- [ ] Move database layer
- [ ] Create auth package with payment gating

### Week 3: App Separation
- [ ] Create web app
- [ ] Create marketing app
- [ ] Update CLI package

### Week 4: Testing & Deployment
- [ ] Test payment gating in both modes
- [ ] Set up deployment pipelines
- [ ] Update documentation

### Week 5: Production Migration
- [ ] Deploy new architecture
- [ ] Monitor and fix issues
- [ ] Update open source documentation

## Potential Challenges & Mitigations

### 1. Shared State Management
- **Challenge**: Auth state sharing between apps
- **Solution**: Use session-based auth with shared session validation

### 2. Development Complexity
- **Challenge**: More complex local development
- **Solution**: Good dev scripts and clear documentation

### 3. Deployment Complexity
- **Challenge**: Multiple apps to deploy and maintain
- **Solution**: Use Vercel's monorepo support or Nx for deployment orchestration

### 4. Bundle Size Optimization
- **Challenge**: Avoiding duplicate dependencies
- **Solution**: Careful package structure and proper tree shaking

## Success Metrics

- [ ] Successful separation of marketing and app concerns
- [ ] Payment gating works correctly in both modes
- [ ] Open source contributors can easily run locally
- [ ] Build times improved for incremental changes
- [ ] Clear deployment separation achieved
- [ ] No regression in functionality or performance

## Next Steps

1. **Validate approach** with team and stakeholders
2. **Create proof of concept** with minimal viable setup
3. **Plan migration timeline** based on current priorities
4. **Set up CI/CD** for new architecture
5. **Create documentation** for contributors and self-hosters

This migration will position BragDoc for better scalability, clearer open source contribution, and more flexible deployment options while maintaining all current functionality.