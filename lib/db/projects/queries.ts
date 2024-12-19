import { and, desc, eq, isNull } from 'drizzle-orm';
import { db } from '@/lib/db';
import { project, type Project } from '@/lib/db/schema';

export type CreateProjectInput = {
  userId: string;
  name: string;
  description?: string;
  companyId?: string;
  status: 'active' | 'completed' | 'archived';
  startDate: Date;
  endDate?: Date;
};

export type UpdateProjectInput = Partial<Omit<CreateProjectInput, 'userId'>>;

export async function getProjectsByUserId(userId: string) {
  return db
    .select()
    .from(project)
    .where(eq(project.userId, userId))
    .orderBy(desc(project.startDate));
}

export async function getProjectById(id: string, userId: string) {
  const results = await db
    .select()
    .from(project)
    .where(and(eq(project.id, id), eq(project.userId, userId)));
  return results[0] || null;
}

export async function getProjectsByCompanyId(companyId: string, userId: string) {
  return db
    .select()
    .from(project)
    .where(
      and(eq(project.companyId, companyId), eq(project.userId, userId))
    )
    .orderBy(desc(project.startDate));
}

export async function getActiveProjects(userId: string) {
  return db
    .select()
    .from(project)
    .where(
      and(
        eq(project.userId, userId),
        eq(project.status, 'active'),
        isNull(project.endDate)
      )
    )
    .orderBy(desc(project.startDate));
}

export async function createProject(input: CreateProjectInput): Promise<Project> {
  const results = await db
    .insert(project)
    .values({
      userId: input.userId,
      name: input.name,
      description: input.description,
      companyId: input.companyId,
      status: input.status,
      startDate: input.startDate,
      endDate: input.endDate,
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
