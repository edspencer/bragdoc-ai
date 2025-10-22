# Task: Dashboard Zero State for New Users

## Background

When new users sign up for BragDoc, they land on an empty dashboard with no achievements. We need to provide a welcoming zero state that guides them through the initial setup process of using the CLI to extract their first achievements from a Git repository.

## Specific Requirements

### Display Logic

- Show the zero state when the user has **zero achievements** in the database
- Once the user has at least one achievement, show the normal dashboard view
- The zero state should replace the main dashboard content (achievements table, charts, etc.)

### Layout & Styling

- **Centered Layout**: The zero state should be centered horizontally on the page
  - Consider vertical centering or top-aligned depending on what looks better
  - Should NOT span the full width of the browser
- **Fixed Width**: Use a fixed/max-width container for consistent styling (e.g., max-w-2xl)
- **Clean Design**: Use existing BragDoc design patterns and shadcn/ui components

### Content

The zero state should include:

1. **Welcome Message**: A friendly greeting for new users
2. **Getting Started Instructions**:
   - How to install/set up the CLI
   - How to authenticate with `bragdoc login`
   - How to initialize a repository with `bragdoc init` or `bragdoc repos add`
   - How to extract achievements with `bragdoc extract`
3. **Action Button**: A button labeled something like "I've run the CLI - Check for achievements" or "Refresh Dashboard"

### Interaction Flow

When the user clicks the action button:

1. **Fetch Latest Data**: Refresh/re-check the user's achievements from the database
2. **Success Case**: If achievements are found, show the normal dashboard view
3. **No Achievements Case**: If still no achievements, display a helpful message below the button:
   - Message: "No achievements yet. Did you run `bragdoc extract`?"
   - Keep the zero state visible with this feedback message

### Technical Considerations

- The dashboard page is at `apps/web/app/(app)/page.tsx`
- Achievements are fetched using database queries from `@bragdoc/database`
- The component should be a server component by default, with a client component for the interactive button
- Follow existing patterns in the codebase for layout and styling
- Reference the CLI documentation for accurate command examples

### UI Components to Consider

- `Card` component for the container
- `Button` component for the action button
- Typography components for headings and instructions
- Code snippets using inline `code` elements or code blocks
- Icons (optional) for visual enhancement

### Example Flow

```
User signs up → Dashboard loads → No achievements found → Show zero state

Zero State Content:
  Welcome to BragDoc!

  Get started by extracting achievements from your Git repositories:

  1. Install the CLI: npm install -g @bragdoc/cli
  2. Login: bragdoc login
  3. Add a repository: bragdoc repos add
  4. Extract achievements: bragdoc extract

  [Button: I've run the CLI - Check for achievements]

User clicks button → Fetch achievements → Still none found → Show message:
  "No achievements yet. Did you run bragdoc extract?"

User runs bragdoc extract → Clicks button again → Achievements found → Show dashboard
```

## Success Criteria

- [ ] Zero state is displayed when user has no achievements
- [ ] Layout is centered and has a fixed/max width
- [ ] Instructions are clear and accurate
- [ ] Button successfully refreshes and checks for achievements
- [ ] Appropriate feedback message is shown when still no achievements
- [ ] Normal dashboard is displayed once achievements exist
- [ ] Design is consistent with existing BragDoc UI
- [ ] Component follows React Server Components patterns
