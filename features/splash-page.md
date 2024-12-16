# Splash Page Feature

## Overview
Replace the current direct login form with a modern, responsive marketing homepage that showcases brag.ai's value proposition and provides clear paths to sign up, log in, and learn more about the product.

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
- `/signup` - New user registration

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
