import { and, desc, eq, isNull } from 'drizzle-orm';
import { db } from '@/lib/db';
import { project, company, type Project, type Company } from '@/lib/db/schema';

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
};

export type UpdateProjectInput = Partial<Omit<CreateProjectInput, 'userId'>>;

export async function getProjectsByUserId(userId: string): Promise<ProjectWithCompany[]> {
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
    })
    .from(project)
    .leftJoin(company, eq(project.companyId, company.id))
    .where(eq(project.userId, userId))
    .orderBy(desc(project.startDate));

  return results.map(row => ({
    ...row,
    company: row.company || null,
  }));
}

export async function getProjectById(id: string, userId: string): Promise<ProjectWithCompany | null> {
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

export async function getProjectsByCompanyId(companyId: string, userId: string): Promise<ProjectWithCompany[]> {
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
    })
    .from(project)
    .leftJoin(company, eq(project.companyId, company.id))
    .where(
      and(eq(project.companyId, companyId), eq(project.userId, userId))
    )
    .orderBy(desc(project.startDate));

  return results.map(row => ({
    ...row,
    company: row.company || null,
  }));
}

export async function getActiveProjects(userId: string): Promise<ProjectWithCompany[]> {
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
    })
    .from(project)
    .leftJoin(company, eq(project.companyId, company.id))
    .where(
      and(
        eq(project.userId, userId),
        eq(project.status, 'active'),
        isNull(project.endDate)
      )
    )
    .orderBy(desc(project.startDate));

  return results.map(row => ({
    ...row,
    company: row.company || null,
  }));
}

export async function createProject(input: CreateProjectInput): Promise<Project> {
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
  input: UpdateProjectInput
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
  userId: string
): Promise<Project | null> {
  const results = await db
    .delete(project)
    .where(and(eq(project.id, id), eq(project.userId, userId)))
    .returning();
  return results[0] || null;
}
