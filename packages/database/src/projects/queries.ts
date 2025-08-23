import { and, desc, eq, isNull } from 'drizzle-orm';
import { db } from '../index';
import { project, company, type Project, type Company } from '../schema';
import { v4 as uuidv4 } from 'uuid';
import { fuzzyFindProject } from './fuzzyFind';

export type ProjectWithCompany = Omit<Project, 'companyId'> & {
  companyId: string | null;
  company: Company | null;
};

export type CreateProjectInput = {
  userId: string;
  name: string;
  description?: string;
  companyId?: string | null;
  status: 'active' | 'completed' | 'archived';
  startDate: Date;
  endDate?: Date | null;
  repoRemoteUrl?: string;
};

export type UpdateProjectInput = Partial<Omit<CreateProjectInput, 'userId'>>;

export async function getProjectsByUserId(
  userId: string,
): Promise<ProjectWithCompany[]> {
  const results = await db
    .select({
      id: project.id,
      userId: project.userId,
      name: project.name,
      description: project.description,
      companyId: project.companyId,
      status: project.status,
      startDate: project.startDate,
      endDate: project.endDate,
      createdAt: project.createdAt,
      updatedAt: project.updatedAt,
      company: company,
      repoRemoteUrl: project.repoRemoteUrl,
    })
    .from(project)
    .leftJoin(company, eq(project.companyId, company.id))
    .where(eq(project.userId, userId))
    .orderBy(desc(project.startDate));

  return results.map((row) => ({
    ...row,
    company: row.company || null,
  }));
}

export async function getProjectById(
  id: string,
  userId: string,
): Promise<ProjectWithCompany | null> {
  const results = await db
    .select({
      id: project.id,
      userId: project.userId,
      name: project.name,
      description: project.description,
      companyId: project.companyId,
      status: project.status,
      startDate: project.startDate,
      endDate: project.endDate,
      createdAt: project.createdAt,
      updatedAt: project.updatedAt,
      company: company,
      repoRemoteUrl: project.repoRemoteUrl,
    })
    .from(project)
    .leftJoin(company, eq(project.companyId, company.id))
    .where(and(eq(project.id, id), eq(project.userId, userId)));

  if (!results.length) return null;

  return {
    ...results[0],
    company: results[0].company || null,
  };
}

export async function getProjectsByCompanyId(
  companyId: string,
  userId: string,
): Promise<ProjectWithCompany[]> {
  const results = await db
    .select({
      id: project.id,
      userId: project.userId,
      name: project.name,
      description: project.description,
      companyId: project.companyId,
      status: project.status,
      startDate: project.startDate,
      endDate: project.endDate,
      createdAt: project.createdAt,
      updatedAt: project.updatedAt,
      company: company,
      repoRemoteUrl: project.repoRemoteUrl,
    })
    .from(project)
    .leftJoin(company, eq(project.companyId, company.id))
    .where(and(eq(project.companyId, companyId), eq(project.userId, userId)))
    .orderBy(desc(project.startDate));

  return results.map((row) => ({
    ...row,
    company: row.company || null,
  }));
}

export async function getActiveProjects(
  userId: string,
): Promise<ProjectWithCompany[]> {
  const results = await db
    .select({
      id: project.id,
      userId: project.userId,
      name: project.name,
      description: project.description,
      companyId: project.companyId,
      status: project.status,
      startDate: project.startDate,
      endDate: project.endDate,
      createdAt: project.createdAt,
      updatedAt: project.updatedAt,
      company: company,
      repoRemoteUrl: project.repoRemoteUrl,
    })
    .from(project)
    .leftJoin(company, eq(project.companyId, company.id))
    .where(
      and(
        eq(project.userId, userId),
        eq(project.status, 'active'),
        isNull(project.endDate),
      ),
    )
    .orderBy(desc(project.startDate));

  return results.map((row) => ({
    ...row,
    company: row.company || null,
  }));
}

export async function createProject(
  input: CreateProjectInput,
): Promise<Project> {
  const results = await db
    .insert(project)
    .values({
      ...input,
      createdAt: new Date(),
      updatedAt: new Date(),
    })
    .returning();
  return results[0];
}

export async function updateProject(
  id: string,
  userId: string,
  input: UpdateProjectInput,
): Promise<Project | null> {
  const results = await db
    .update(project)
    .set({
      ...input,
      updatedAt: new Date(),
    })
    .where(and(eq(project.id, id), eq(project.userId, userId)))
    .returning();
  return results[0] || null;
}

export async function deleteProject(
  id: string,
  userId: string,
): Promise<Project | null> {
  const results = await db
    .delete(project)
    .where(and(eq(project.id, id), eq(project.userId, userId)))
    .returning();
  return results[0] || null;
}

/**
 * Ensure a project exists for the given repository
 */
export async function ensureProject({
  userId,
  remoteUrl,
  repositoryName,
}: {
  userId: string;
  remoteUrl: string;
  repositoryName: string;
}): Promise<{ projectId: string }> {
  console.log(`Ensure project for ${repositoryName} (${remoteUrl})`);

  // First check if we already have a project with this remote URL
  const [existingProject] = await db
    .select()
    .from(project)
    .where(
      and(
        eq(project.userId, userId),
        eq(project.repoRemoteUrl, remoteUrl)
      )
    )
    .limit(1);

  if (existingProject) {
    console.log(`Found existing project ${existingProject.id}`);

    return { projectId: existingProject.id };
  }

  // Get all projects for this user that don't have a remote URL set
  const projects = await db
    .select()
    .from(project)
    .where(
      and(
        eq(project.userId, userId),
        isNull(project.repoRemoteUrl)
      )
    );

  if (projects.length > 0) {
    const matchingProjectId = await fuzzyFindProject(repositoryName, projects);

    if (matchingProjectId) {
      // Update the matching project with the remote URL
      await db
        .update(project)
        .set({ repoRemoteUrl: remoteUrl })
        .where(eq(project.id, matchingProjectId));

      console.log(`Found matching project ${matchingProjectId}, set remote URL`);
      
      return { projectId: matchingProjectId };
    }
  }

  // Create a new project
  const [newProject] = await db
    .insert(project)
    .values({
      id: uuidv4(),
      userId,
      name: repositoryName,
      description: `Project for ${repositoryName} repository`,
      status: 'active',
      startDate: new Date(),
      repoRemoteUrl: remoteUrl,
    })
    .returning();

  console.log(`Created new project ${newProject.id}`);

  return { projectId: newProject.id };
}
