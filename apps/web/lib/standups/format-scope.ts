import type { Company, Project } from '@bragdoc/database';

/**
 * Format standup scope description based on company/project selection
 *
 * Logic:
 * - If companyId set: "All [CompanyName] Projects"
 * - If 1 project: project name
 * - If 2-3 projects: comma-separated names
 * - If 4+ projects: first 2 names + "and N more Projects"
 * - Otherwise: "All Projects"
 */
export function formatStandupScope(
  companyId: string | null,
  projectIds: string[] | null,
  companies: Company[],
  projects: Project[],
): string {
  if (companyId) {
    const company = companies.find((c) => c.id === companyId);
    return company?.name ? `All ${company.name} Projects` : 'All Projects';
  }

  if (projectIds && projectIds.length > 0) {
    if (projectIds.length === 1) {
      const project = projects.find((p) => p.id === projectIds[0]);
      return project?.name || 'All Projects';
    }

    // Multiple projects selected
    const selectedProjects = projects.filter((p) =>
      projectIds.includes(p.id),
    );

    if (selectedProjects.length <= 3) {
      // Show all names if 3 or fewer
      return selectedProjects.map((p) => p.name).join(', ');
    }

    // Show first 2 names and count of remaining
    const firstTwo = selectedProjects
      .slice(0, 2)
      .map((p) => p.name)
      .join(', ');
    const remaining = selectedProjects.length - 2;
    return `${firstTwo} and ${remaining} more`;
  }

  return 'All Projects';
}
