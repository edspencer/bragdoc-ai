Add Careers section to navigation and remove Documents section

This change restructures the main sidebar navigation by removing the Documents section and introducing a new "Careers" section that consolidates career-related features. The Careers section groups together existing features (Standup and "For my manager") with two new coming-soon pages (Performance Review and Workstreams), creating a more intuitive organization for users focused on career advancement and documentation.

The implementation includes a new `NavCareers` component that follows the same patterns as other navigation components in the codebase. Two placeholder pages have been created at `/performance` and `/workstreams` with informative coming-soon messages that give users clear expectations about upcoming functionality. The Workstreams page includes detailed context about the planned AI-powered feature for automatic achievement clustering and pattern discovery.

The Documents section has been completely removed from the navigation sidebar, though the `/documents` page and its associated functionality remain accessible via direct URL. This change improves the information architecture by separating document management from the primary navigation flow while keeping career-focused features prominently displayed and easily accessible.
