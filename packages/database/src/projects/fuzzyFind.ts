import type { Project } from '../schema';

/**
 * Simple fuzzy match a repository to an existing project. If a match is found, return the project ID.
 * If no match is found, return null.
 */
export async function fuzzyFindProject(repositoryName: string, projects: Project[]): Promise<string | null> {
  console.log('Fuzzy finding project for repository:', repositoryName);

  const repoNameLower = repositoryName.toLowerCase();
  
  // Look for exact matches first
  for (const project of projects) {
    if (project.name.toLowerCase() === repoNameLower) {
      return project.id;
    }
  }
  
  // Look for partial matches
  for (const project of projects) {
    const projectNameLower = project.name.toLowerCase();
    if (projectNameLower.includes(repoNameLower) || repoNameLower.includes(projectNameLower)) {
      return project.id;
    }
  }
  
  // Look for matches in description
  for (const project of projects) {
    if (project.description && project.description.toLowerCase().includes(repoNameLower)) {
      return project.id;
    }
  }
  
  return null;
}