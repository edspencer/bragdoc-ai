# Splash Page Feature

## Overview
Replace the current direct login form with a modern, responsive marketing homepage that showcases bragdoc.ai's value proposition and provides clear paths to sign up, log in, and learn more about the product.

## Technical Requirements

### Layout Structure
- Create a new root layout for non-authenticated users (`app/(marketing)/layout.tsx`)
- Implement responsive design using Tailwind CSS
- Use Shadcn UI components for consistent styling
- Support dark/light mode theming

### Core Components
1. Navigation Header
   - Logo and branding
   - Main navigation links (Features, Pricing, About)
   - CTA buttons (Login, Sign Up)
   - Mobile-responsive hamburger menu
   - Dark mode toggle

2. Hero Section
   - Compelling headline about tracking work achievements
   - Subheadline explaining core value proposition
   - Primary CTA (Get Started)
   - Secondary CTA (Learn More)
   - Hero image/animation showing the product

3. Features Section
   - Key feature cards highlighting:
     - Auto-capture from GitHub
     - AI-powered achievement extraction
     - Performance review document generation
     - Weekly/monthly summaries
   - Visual representations for each feature

4. Social Proof Section
   - Testimonials/quotes
   - Logos of companies using the product
   - Key metrics/statistics

5. Pricing Section
   - Tiered pricing cards
   - Feature comparison table
   - FAQ about pricing

6. Footer
   - Company information
   - Legal links (Privacy, Terms)
   - Social media links
   - Newsletter signup

### Technical Implementation Details

#### File Structure
```
app/
  ├── (marketing)/
  │   ├── layout.tsx
  │   ├── page.tsx
  │   ├── pricing/
  │   │   └── page.tsx
  │   └── about/
  │       └── page.tsx
  ├── components/
  │   └── marketing/
  │       ├── Navigation.tsx
  │       ├── Hero.tsx
  │       ├── Features.tsx
  │       ├── Pricing.tsx
  │       └── Footer.tsx
```

#### Required Shadcn Components
- Button
- NavigationMenu
- Sheet (for mobile menu)
- Card
- Tabs
- Accordion (for FAQ)
- Form components for newsletter

#### Data Requirements
- Create content models for:
  - Feature descriptions
  - Pricing tiers
  - Testimonials
  - FAQ items

#### Routes
- `/` - Main splash page
- `/pricing` - Detailed pricing page
- `/about` - About page
- `/login` - Enhanced login page
- `/register` - New user registration

## TypeScript Implementation Details

### Type Definitions
Create a `types.ts` file in the marketing components directory:
```typescript
interface FeatureCard {
  title: string;
  description: string;
  icon: React.ComponentType;
  benefits: string[];
}

interface PricingTier {
  name: string;
  price: string;
  features: string[];
  highlighted: boolean;
}

interface Testimonial {
  quote: string;
  author: string;
  role: string;
  company: string;
  image?: string;
}
```

### Component Props
- All components should have proper TypeScript interfaces
- Avoid using React.FC as per guidelines
- Use named exports for all components

### Error Boundaries
Add error boundaries for:
- Feature card sections
- Pricing calculator
- Newsletter signup form
- Authentication redirects

## Development Environment Setup

### Required Commands
```bash
# Install required shadcn components
npx shadcn@latest add button
npx shadcn@latest add navigation-menu
npx shadcn@latest add sheet
npx shadcn@latest add card
npx shadcn@latest add tabs
npx shadcn@latest add accordion
npx shadcn@latest add form

# Install additional dependencies
pnpm add @radix-ui/react-icons
pnpm add @vercel/analytics
```

### Component Organization
Following project naming conventions:
```
components/
  └── marketing/
      ├── HeroSection.tsx
      ├── FeatureCard.tsx
      ├── PricingTier.tsx
      ├── TestimonialCard.tsx
      ├── NewsletterForm.tsx
      └── types.ts
```

## State Management
- Use SWR for API data fetching
- Implement proper loading states
- Handle error states gracefully
- Cache pricing and feature data

## Accessibility Requirements
- Implement proper ARIA labels
- Ensure keyboard navigation
- Add skip links for main content
- Support screen readers
- Provide alt text for all images

## Mobile Considerations
- Define breakpoint-specific layouts
- Implement touch-friendly interactions
- Optimize images for mobile
- Test on various device sizes

## Documentation Requirements
- Add JSDoc comments for all components
- Document all props and interfaces
- Include usage examples
- Add storybook stories for components

## Git Workflow
- Create feature branch: `feat/splash-page`
- Use atomic commits with proper prefixes
- Include detailed PR description
- Add before/after screenshots

## Design Guidelines
- Use consistent spacing (Tailwind's spacing scale)
- Follow accessible color contrast ratios
- Implement smooth transitions and animations
- Ensure mobile-first responsive design
- Use modern, clean aesthetic aligned with SaaS trends

## Performance Requirements
- Optimize images using next/image
- Implement lazy loading for below-the-fold content
- Ensure fast initial page load (target < 2s)
- Achieve high Lighthouse scores

## Analytics and Tracking
- Implement conversion tracking
- Add event tracking for:
  - CTA clicks
  - Pricing page views
  - Sign up form starts/completions
  - Feature section engagement

## Testing Requirements
- Component tests for all new UI components
- E2E tests for sign up flow
- Responsive testing across devices
- A11y testing

## Security Considerations
- Implement proper CSRF protection
- Secure form submissions
- Rate limiting for auth endpoints
- Input sanitization

## Launch Checklist
- [ ] SEO optimization (meta tags, sitemap)
- [ ] Social media preview cards
- [ ] Cross-browser testing
- [ ] Mobile responsiveness verification
- [ ] Performance audit
- [ ] Analytics implementation
- [ ] A11y compliance check
- [ ] Legal compliance (privacy policy, terms)

## Dependencies
- Tailwind UI Component Library
- Shadcn UI components
- Radix UI primitives
- Next.js App Router
- NextAuth.js for authentication

## Timeline
Phase 1: Core Layout and Navigation
Phase 2: Hero and Features Sections
Phase 3: Pricing and Social Proof
Phase 4: Polish and Performance
Phase 5: Testing and Launch

## Success Metrics
- Increased sign-up conversion rate
- Improved time on site
- Lower bounce rate
- Higher engagement with feature content
- Increased organic traffic

## Copy and Messaging Guidelines

#### Value Proposition
Primary messaging should focus on key benefits from our research:
- Never miss an achievement: Automatic tracking of your professional wins
- Performance review ready: Turn your achievements into compelling review documents
- Career advancement support: Data-backed evidence for promotions and raises
- Continuous growth tracking: Monitor your professional development journey

#### Hero Section Content
Headline options:
- "Transform Your Achievements into Career Growth"
- "Never Let Your Wins Go Unnoticed"
- "Your Professional Success Story, Automatically Documented"

Subheadline messaging should emphasize:
- Automatic achievement tracking from daily work
- Easy preparation for performance reviews
- Data-driven support for career advancement
- Time-saving through AI-powered documentation

#### Features Section Messaging
Frame features around core benefits:
1. **Automatic Achievement Tracking**
   - "Capture your wins as they happen"
   - "From GitHub commits to client praise, nothing gets missed"

2. **Smart Documentation**
   - "AI-powered achievement recognition"
   - "Turns your daily work into structured accomplishments"

3. **Performance Review Ready**
   - "Generate comprehensive review documents instantly"
   - "Present your achievements with confidence"

4. **Career Growth Tools**
   - "Data-backed evidence for promotions"
   - "Quantifiable results for salary negotiations"

#### Social Proof Section
Focus testimonials on key outcomes:
- Time saved in review preparation
- Successful promotion stories
- Salary negotiation wins
- Improved self-awareness and confidence

#### Benefits Section
Highlight researched benefits:
1. **For Performance Reviews**
   - Present specific examples aligned with goals
   - Demonstrate progress over time
   - Highlight overlooked contributions

2. **For Career Advancement**
   - Showcase proven success track record
   - Evidence readiness for greater responsibility
   - Stand out in competitive situations

3. **For Salary Negotiations**
   - Back requests with quantifiable results
   - Demonstrate consistent value addition
   - Show commitment to growth

4. **For Professional Growth**
   - Build confidence through achievement tracking
   - Increase awareness of skills and impact
   - Set and pursue clear career goals
