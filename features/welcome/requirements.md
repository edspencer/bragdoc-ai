# Welcome Carousel Feature Requirements

## Overview
Implement an interactive welcome carousel for new users to demonstrate key features of bragdoc.ai. The carousel will appear when users first log in or sign up, showing a series of cards that showcase the core functionality, with emphasis on achievement extraction from chat messages.

## Feature Requirements

### Carousel Structure
- Two cards to maintain focus and simplicity
- Entire carousel should be skippable
- Navigation controls for Next/Previous/Skip
- Progress indicator showing current card position
- Responsive design that works on all screen sizes
- Dark mode support

### Card Contents

#### Card 1: Chat Demo
- Show a simulated chat conversation demonstrating achievement extraction
- Example user message: "I fixed up the bugs with the autofocus dashboard generation and we launched autofocus version 2.1 this morning. I also added a new feature to do custom printing jobs."
- Animated AI response showing multiple achievements being extracted
- Reuse existing AchievementActions component (formerly BragActions)
- Animate achievements appearing with 500ms delay between each

#### Card 2: Project & Company Management
- Brief overview of how to organize achievements
- Show simplified versions of project/company management interfaces
- Highlight the optional nature of these associations

## Updates to existing Components
The feature requires a change to the existing chat interface to handle the empty chat state.
Currently that interface shows some generic "this is a chatbot" text. Remove this and:

- Add prominent action buttons in the empty chat window:
  - "Create a Company" button that opens the company creation dialog
  - "Create a Project" button that opens the project creation dialog
- Position these above any existing suggested actions/prompts
- Style to be visually distinct from chat prompt suggestions
- Include helpful icons (e.g., building for company, folder for project)
- Maintain dark mode compatibility
- They should only appear when the chat window is empty

### Mobile Considerations
- Responsive Design for different screen sizes
- Action buttons should stack vertically on mobile for better touch targets
- Adequate spacing between buttons to prevent accidental taps
- Icons should remain visible but scale appropriately
- Text should not wrap awkwardly on narrow screens
- Company/Project creation dialogs should be full-screen on mobile
- All interactions should work with touch events

## Components

### WelcomeCarousel
```typescript
interface WelcomeCarouselProps {
  onComplete: () => void;
  onSkip: () => void;
}
```

### CarouselCard
```typescript
interface CarouselCardProps {
  content: ReactNode;
  index: number;
  totalCards: number;
  onNext: () => void;
  onPrevious: () => void;
  onSkip: () => void;
}
```

### ChatDemoCard
```typescript
interface ChatDemoCardProps {
  achievements: Achievement[];
  onAnimationComplete: () => void;
}
```

## Implementation Details

### NextAuth Configuration
Update the NextAuth configuration to direct new users to our welcome carousel:
```typescript
// app/api/auth/[...nextauth]/route.ts
export const authOptions = {
  // ... other options
  pages: {
    newUser: '/welcome' // New users will be directed here on first sign in
  }
}
```

### File Structure
```
app/
  (app)/
    welcome/
      page.tsx          # Welcome carousel page for new users
    chat/
      page.tsx          # Update to handle empty state

components/
  chat/
    empty-state.tsx     # New component for empty chat state
    action-buttons.tsx  # New component for company/project buttons
  welcome/
    carousel.tsx        # Main carousel component
    card.tsx            # Individual card component
    chat-demo.tsx       # First card demo content
    project-demo.tsx    # Second card demo content
```

### Required Component Installation
```bash
# Install required shadcn components if not already present
npx shadcn-ui@latest add carousel
npx shadcn-ui@latest add button
npx shadcn-ui@latest add card
```

### State Management
- User preferences stored in User table:
```typescript
interface UserPreferences {
  hasSeenWelcome: boolean;
  language: string;  // Default from OAuth provider or 'en'
}
```

### Routing
- After completing or skipping the welcome carousel, redirect to `/chat`
- The welcome page should be accessible only to authenticated users
- Add middleware to prevent returning users from seeing the welcome page

### API Routes
- Update user preferences:
```typescript
// PUT /api/user
interface UpdateUserRequest {
  preferences?: {
    hasSeenWelcome?: boolean;
    language?: string;
  };
  // ... other user fields
}
```

### Database Changes
```sql
-- Add preferences JSON column to User table
ALTER TABLE "User" 
ADD COLUMN preferences jsonb NOT NULL DEFAULT '{
  "hasSeenWelcome": false,
  "language": "en"
}';
```

### Error Handling
- Handle failed preference updates gracefully
- Provide fallback UI if carousel components fail to load
- Show error state if company/project creation fails

### Loading States
- Show skeleton UI while checking user preferences
- Animate card transitions smoothly
- Handle loading states for company/project creation

### Testing Checklist
- [ ] New users are correctly redirected to `/welcome`
- [ ] Carousel navigation works (next, previous, skip)
- [ ] Achievement animation timing is correct
- [ ] Empty state buttons appear only when chat is empty
- [ ] Company/project creation flows work
- [ ] Responsive design works on all screen sizes
- [ ] Dark mode styling is consistent
- [ ] Error states are handled gracefully
- [ ] Returning users go directly to chat

### Performance Considerations
- Lazy load carousel components
- Optimize images and icons
- Minimize main thread blocking during animations
- Ensure smooth transitions on mobile devices

### Accessibility Requirements
- All buttons must have aria-labels
- Carousel must be keyboard navigatable
- Color contrast must meet WCAG standards
- Screen reader announcements for card transitions
- Focus management between cards and modals

### Browser Support
- Support latest 2 versions of major browsers
- Ensure touch events work on mobile browsers
- Test on both iOS Safari and Chrome for Android

## Component Reuse

### Existing Components
We'll reuse the following components from the codebase:

#### UI Components
- `Card` from `/components/ui/card.tsx` - Base container for carousel cards
- `Button` from `/components/ui/button.tsx` - Navigation and skip controls
- `Separator` from `/components/ui/separator.tsx` - Visual dividers between sections

#### Achievement Components
- `AchievementCard` from `/components/achievements/AchievementCard.tsx`
  - Used to display extracted achievements in Card 1
  - Props needed: `achievement`, no handlers needed for demo
  - Will be wrapped in animation logic
  
- `AchievementActions` from `/components/achievements/achievement-actions.tsx`
  - Used to show the actions that appear after achievement extraction
  - Will be simplified to remove edit/delete functionality for demo

### Adaptations Needed

#### ChatDemoMessage
New component to simulate the chat interface:
```typescript
interface ChatDemoMessageProps {
  message: string;
  isUser: boolean;
  className?: string;
}
```

#### AnimatedAchievementList
New component wrapping AchievementCard with animation:
```typescript
interface AnimatedAchievementListProps {
  achievements: Achievement[];
  onComplete: () => void;
  animationDelay?: number; // defaults to 500ms
}
```

### Component Hierarchy
```
WelcomeCarousel
├── CarouselCard
│   ├── Card 1: Chat Demo
│   │   ├── ChatDemoMessage (user)
│   │   ├── ChatDemoMessage (ai)
│   │   └── AnimatedAchievementList
│   │       └── AchievementCard[]
│   └── Card 2: Project & Company
│       └── [Custom Layout with existing UI components]
└── CarouselNavigation
    └── [Built with Button components]
```

## Animation Implementation
- Use array slicing for achievement animation
- Start with empty array, add one achievement every 500ms
- No need for Framer Motion, simple array manipulation is sufficient
```typescript
const [visibleAchievements, setVisibleAchievements] = useState<Achievement[]>([]);

useEffect(() => {
  achievements.forEach((_, index) => {
    setTimeout(() => {
      setVisibleAchievements(achievements.slice(0, index + 1));
    }, index * 500);
  });
}, [achievements]);
```

## User Flow
1. User logs in/signs up
2. Check if user should see welcome carousel (new user or no achievements)
3. Display carousel if needed
4. Allow skip at any point
5. Mark tutorial as completed in user preferences
6. Redirect to main chat interface

## Storage
Add to user preferences table:
```typescript
hasCompletedWelcome: boolean('has_completed_welcome').default(false)
```

## API Routes
- `PUT /api/user` - Update user preferences including welcome completion status

## Testing Requirements
- Unit tests for carousel navigation
- Integration tests for achievement animation
- Responsive design tests across different screen sizes
- Dark mode visual testing
- Skip functionality testing
- Animation timing verification

## Accessibility Requirements
- Keyboard navigation support
- Screen reader compatibility
- ARIA labels for all interactive elements
- Focus management between cards
- Respect reduced motion preferences
