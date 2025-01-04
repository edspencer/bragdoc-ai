export const SCENARIO_TEMPLATES = {
  MULTI_COMPANY: {
    description: 'Professional working at multiple companies simultaneously',
    prompt: `Create a scenario for a tech professional working at multiple companies:
    - One full-time role at a tech company
    - One part-time consulting role
    - Multiple ongoing projects at each company
    - Mix of technical and leadership responsibilities
    Include specific details about company names, roles, project names, and realistic timeframes.`,
  },
  CAREER_TRANSITION: {
    description: 'Professional transitioning between companies',
    prompt: `Create a scenario for a professional transitioning between companies:
    - Previous role at a well-known company
    - New role at a different company with increased responsibilities
    - Project handover discussions
    - Starting new initiatives at the new company
    Include specific details about both companies, roles, projects being handed over, and new projects being started.`,
  },
  PERSONAL_GROWTH: {
    description: 'Mix of work and personal achievements',
    prompt: `Create a scenario mixing professional and personal achievements:
    - Current role at a company
    - Personal side projects or learning initiatives
    - Community involvement or mentorship
    - Non-work related accomplishments
    Include specific details about the company, role, personal projects, and timeframes.`,
  },
  PROJECT_LEAD: {
    description: 'Leading multiple projects at one company',
    prompt: `Create a scenario for a project lead managing multiple initiatives:
    - Senior role at a single company
    - Multiple concurrent projects with different teams
    - Mix of technical and people management
    - Clear project milestones and metrics
    Include specific details about the company, role, project names, team sizes, and measurable outcomes.`,
  },
} as const;

export type ScenarioTemplate = keyof typeof SCENARIO_TEMPLATES;
