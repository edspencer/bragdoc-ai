import { and, desc, eq, isNull, sum, sql, count } from 'drizzle-orm';
import { db } from '../index';
import {
  project,
  company,
  achievement,
  type Project,
  type Company,
} from '../schema';
import { v4 as uuidv4 } from 'uuid';
import { fuzzyFindProject } from './fuzzyFind';

// Color palette for projects - defined here to avoid cross-package dependencies
const PROJECT_COLORS = [
  '#3B82F6',
  '#10B981',
  '#F59E0B',
  '#EF4444',
  '#8B5CF6',
  '#06B6D4',
  '#F97316',
  '#84CC16',
  '#EC4899',
  '#6366F1',
  '#14B8A6',
  '#FACC15',
  '#A855F7',
  '#0EA5E9',
  '#FB923C',
  '#22C55E',
] as const;

/**
 * Get the next color for a user's projects using round-robin assignment
 */
async function getNextProjectColor(userId: string): Promise<string> {
  // Get the count of existing projects for the user
  const result = await db
    .select({ count: count(project.id) })
    .from(project)
    .where(eq(project.userId, userId));

  const existingProjectCount = result[0]?.count || 0;
  return PROJECT_COLORS[existingProjectCount % PROJECT_COLORS.length]!;
}

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
  color?: string;
};

export type UpdateProjectInput = Partial<Omit<CreateProjectInput, 'userId'>>;

export type ProjectWithImpact = ProjectWithCompany & {
  totalImpact: number;
  achievementCount: number;
};

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
      color: project.color,
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
      color: project.color,
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
    ...results[0]!,
    company: results[0]!.company || null,
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
      color: project.color,
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
      color: project.color,
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
  // If no color is provided, use round-robin assignment
  const color = input.color || (await getNextProjectColor(input.userId));

  const results = await db
    .insert(project)
    .values({
      ...input,
      color,
      createdAt: new Date(),
      updatedAt: new Date(),
    })
    .returning();
  return results[0]!;
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
  return results[0]! || null;
}

export async function deleteProject(
  id: string,
  userId: string,
): Promise<Project | null> {
  const results = await db
    .delete(project)
    .where(and(eq(project.id, id), eq(project.userId, userId)))
    .returning();
  return results[0]! || null;
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
      and(eq(project.userId, userId), eq(project.repoRemoteUrl, remoteUrl)),
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
    .where(and(eq(project.userId, userId), isNull(project.repoRemoteUrl)));

  if (projects.length > 0) {
    const matchingProjectId = await fuzzyFindProject(repositoryName, projects);

    if (matchingProjectId) {
      // Update the matching project with the remote URL
      await db
        .update(project)
        .set({ repoRemoteUrl: remoteUrl })
        .where(eq(project.id, matchingProjectId));

      console.log(
        `Found matching project ${matchingProjectId}, set remote URL`,
      );

      return { projectId: matchingProjectId };
    }
  }

  // Create a new project with round-robin color assignment
  const color = await getNextProjectColor(userId);
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
      color,
    })
    .returning();

  console.log(`Created new project ${newProject!.id}`);

  return { projectId: newProject!.id };
}

export async function getTopProjectsByImpact(
  userId: string,
  limit: number = 5,
): Promise<ProjectWithImpact[]> {
  const results = await db
    .select({
      id: project.id,
      userId: project.userId,
      name: project.name,
      description: project.description,
      companyId: project.companyId,
      status: project.status,
      color: project.color,
      startDate: project.startDate,
      endDate: project.endDate,
      createdAt: project.createdAt,
      updatedAt: project.updatedAt,
      repoRemoteUrl: project.repoRemoteUrl,
      company: company,
      totalImpact: sql<number>`COALESCE(SUM(${achievement.impact}), 0)`,
      achievementCount: sql<number>`COUNT(${achievement.id})`,
    })
    .from(project)
    .leftJoin(company, eq(project.companyId, company.id))
    .leftJoin(
      achievement,
      and(
        eq(achievement.projectId, project.id),
        eq(achievement.isArchived, false),
      ),
    )
    .where(eq(project.userId, userId))
    .groupBy(
      project.id,
      project.userId,
      project.name,
      project.description,
      project.companyId,
      project.status,
      project.color,
      project.startDate,
      project.endDate,
      project.createdAt,
      project.updatedAt,
      project.repoRemoteUrl,
      company.id,
      company.name,
      company.domain,
      company.role,
      company.startDate,
      company.endDate,
      company.userId,
    )
    .orderBy(
      desc(sql`COALESCE(SUM(${achievement.impact}), 0)`),
      desc(project.startDate),
    )
    .limit(limit);

  return results.map((row) => ({
    ...row,
    company: row.company || null,
    totalImpact: Number(row.totalImpact),
    achievementCount: Number(row.achievementCount),
  }));
}
