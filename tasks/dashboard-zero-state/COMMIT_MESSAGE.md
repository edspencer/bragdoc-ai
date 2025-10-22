Add welcoming zero state to dashboard for new users with no achievements

When new users sign up for BragDoc and navigate to the dashboard, they now see a welcoming zero state instead of an empty page with zero stats. The zero state provides clear, step-by-step instructions for installing the CLI, authenticating, initializing a Git repository, and extracting achievements. This guides users through the initial setup process and helps them understand how to populate their dashboard with data.

The implementation adds a new `DashboardZeroState` client component that displays centered content with CLI setup instructions and an interactive "Check for achievements" button. The dashboard page now conditionally renders either the zero state (when `totalAchievements === 0`) or the normal dashboard content (stats, charts, activity stream) based on achievement count. The zero state uses the existing pattern established by `StandupZeroState` with a centered layout constrained to `max-w-2xl` width.

The refresh button uses Next.js `router.refresh()` to re-fetch server component data and check if achievements have been added. If still no achievements exist after refreshing, a feedback message appears prompting the user to verify they ran `bragdoc extract`. Once achievements exist, the dashboard automatically transitions to the normal view with populated stats and visualizations.
