/**
 * Fake data module for Performance Review Edit Page UI implementation.
 *
 * This module provides mock data structures for developing the UI without
 * backend integration. All data is hardcoded and designed to showcase
 * the various UI states and components.
 */

// =============================================================================
// Type Definitions
// =============================================================================

export interface FakePerformanceReview {
  id: string;
  name: string;
  startDate: Date;
  endDate: Date;
  projectIds: string[];
  document: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface FakeProject {
  id: string;
  name: string;
  color: string;
}

export interface FakeWorkstream {
  id: string;
  name: string;
  color: string;
  achievementCount: number;
  startDate: Date;
  endDate: Date;
}

export interface FakeChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Calculate a date relative to today.
 * @param monthsAgo Number of months in the past (positive) or future (negative)
 * @param daysOffset Additional days offset within that month
 */
function getRelativeDate(monthsAgo: number, daysOffset: number = 0): Date {
  const date = new Date();
  date.setMonth(date.getMonth() - monthsAgo);
  date.setDate(date.getDate() + daysOffset);
  date.setHours(0, 0, 0, 0);
  return date;
}

// =============================================================================
// Fake Projects
// =============================================================================

export const fakeProjects: FakeProject[] = [
  {
    id: 'proj-api-platform',
    name: 'API Platform',
    color: '#3B82F6', // Blue
  },
  {
    id: 'proj-web-dashboard',
    name: 'Web Dashboard',
    color: '#10B981', // Green
  },
  {
    id: 'proj-mobile-app',
    name: 'Mobile App',
    color: '#F59E0B', // Amber
  },
  {
    id: 'proj-infrastructure',
    name: 'Infrastructure',
    color: '#EF4444', // Red
  },
  {
    id: 'proj-documentation',
    name: 'Documentation',
    color: '#8B5CF6', // Purple
  },
];

// =============================================================================
// Fake Performance Review
// =============================================================================

export const fakePerformanceReview: FakePerformanceReview = {
  id: 'review-q4-2024',
  name: 'Q4 2024 Performance Review',
  startDate: getRelativeDate(6), // 6 months ago
  endDate: new Date(), // Today
  projectIds: fakeProjects.map((p) => p.id),
  document: null, // Start with no document (zero state)
  createdAt: getRelativeDate(0, -7), // Created a week ago
  updatedAt: new Date(),
};

// =============================================================================
// Fake Workstreams
// =============================================================================

export const fakeWorkstreams: FakeWorkstream[] = [
  {
    id: 'ws-api-redesign',
    name: 'API Redesign Initiative',
    color: '#3B82F6', // Blue
    achievementCount: 12,
    startDate: getRelativeDate(6),
    endDate: getRelativeDate(3),
  },
  {
    id: 'ws-performance-optimization',
    name: 'Performance Optimization',
    color: '#10B981', // Green
    achievementCount: 8,
    startDate: getRelativeDate(5),
    endDate: getRelativeDate(2),
  },
  {
    id: 'ws-mobile-launch',
    name: 'Mobile App Launch',
    color: '#F59E0B', // Amber
    achievementCount: 15,
    startDate: getRelativeDate(4),
    endDate: getRelativeDate(1),
  },
  {
    id: 'ws-security-audit',
    name: 'Security Audit & Compliance',
    color: '#EF4444', // Red
    achievementCount: 6,
    startDate: getRelativeDate(3),
    endDate: getRelativeDate(1, -15),
  },
  {
    id: 'ws-team-mentorship',
    name: 'Team Mentorship Program',
    color: '#8B5CF6', // Purple
    achievementCount: 9,
    startDate: getRelativeDate(6),
    endDate: new Date(),
  },
];

// =============================================================================
// Fake Document Content
// =============================================================================

export const fakeDocumentContent = `# Q4 2024 Performance Review

## Summary

This review period has been marked by significant technical achievements, cross-functional collaboration, and meaningful contributions to team growth. I led several high-impact initiatives that directly contributed to our product roadmap and organizational goals, while also investing in the professional development of team members.

## Key Accomplishments

### API Platform Redesign

Led the comprehensive redesign of our core API platform, improving response times by 40% and reducing infrastructure costs by 25%. This initiative involved:

- Architecting a new microservices-based approach that improved scalability
- Implementing advanced caching strategies using Redis and CDN optimization
- Designing backward-compatible migration paths for existing clients
- Creating comprehensive API documentation and developer guides

### Mobile App Launch

Successfully delivered the mobile application MVP ahead of schedule, achieving 4.8-star ratings across both app stores. Key contributions included:

- Establishing the React Native architecture and component library
- Implementing offline-first data synchronization
- Leading code reviews and establishing mobile development best practices
- Coordinating with design and product teams on user experience improvements

### Performance Optimization Initiative

Identified and resolved critical performance bottlenecks that were impacting user experience:

- Reduced page load times by 60% through code splitting and lazy loading
- Optimized database queries, decreasing average response time from 450ms to 120ms
- Implemented monitoring dashboards for real-time performance tracking
- Established performance budgets and automated regression testing

## Impact & Metrics

| Metric | Before | After | Improvement |
|--------|--------|-------|-------------|
| API Response Time | 850ms | 510ms | 40% faster |
| Mobile App Rating | N/A | 4.8/5 | New product |
| Page Load Time | 3.2s | 1.3s | 60% faster |
| Infrastructure Costs | $45k/mo | $34k/mo | 25% reduction |
| Team Velocity | 42 pts/sprint | 58 pts/sprint | 38% increase |

## Professional Growth

### Technical Leadership

- Mentored three junior developers through structured 1:1 sessions and pair programming
- Presented two technical talks at team all-hands on API design patterns and performance optimization
- Contributed to engineering blog with articles on our mobile architecture decisions

### Cross-Functional Collaboration

- Partnered with Product on defining technical feasibility for Q1 roadmap items
- Collaborated with Design on establishing a component library that improved development velocity
- Worked with Security team on compliance requirements and implementation strategies

### Learning & Development

- Completed AWS Solutions Architect certification
- Attended ReactConf and implemented learnings in our mobile architecture
- Participated in internal book club focused on distributed systems

## Goals for Next Period

1. **Scale the API platform** to handle 10x current traffic in preparation for enterprise launch
2. **Expand mobile feature set** with push notifications, analytics dashboard, and offline improvements
3. **Establish engineering excellence program** including lunch-and-learns and technical writing workshops
4. **Reduce technical debt** by 30% through dedicated refactoring sprints
5. **Improve team onboarding** with better documentation and structured mentorship pairing

## Conclusion

This review period demonstrated my ability to deliver high-impact technical work while fostering team growth and cross-functional relationships. I'm proud of the measurable improvements we achieved and excited to build on this momentum in the coming quarter.
`;

// =============================================================================
// Fake Chat Messages
// =============================================================================

export const fakeChatMessages: FakeChatMessage[] = [
  {
    role: 'user',
    content:
      'Can you add more specific metrics about the mobile app launch? I want to highlight the user adoption numbers.',
  },
  {
    role: 'assistant',
    content:
      "I've updated the Mobile App Launch section to include user adoption metrics. The section now highlights that the app achieved 15,000 downloads in the first month with a 45% week-over-week growth rate. I also added details about the 72% user retention rate after 30 days, which is above industry average.",
  },
  {
    role: 'user',
    content:
      'Great! Can you also make the professional growth section more concise? It feels a bit long.',
  },
  {
    role: 'assistant',
    content:
      "I've condensed the Professional Growth section by combining the Technical Leadership and Learning & Development subsections. The key achievements are now presented in a more streamlined bullet-point format while still highlighting your mentorship of junior developers, technical presentations, and AWS certification. The section is now about 40% shorter while retaining all important information.",
  },
];

// =============================================================================
// localStorage Keys
// =============================================================================

export const INSTRUCTIONS_KEY = 'performance-review-instructions';
export const SAVE_INSTRUCTIONS_KEY = 'performance-review-save-instructions';
