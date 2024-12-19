import { z } from 'zod';
import type { Project } from './schema';

/**
 * Project status type
 */
export type ProjectStatus = 'active' | 'completed' | 'archived';

/**
 * Base schema for project validation
 */
const projectBaseSchema = {
  name: z.string().min(1).max(256),
  description: z.string().nullable().optional(),
  companyId: z.string().uuid().nullable().optional(),
  status: z.enum(['active', 'completed', 'archived']),
  startDate: z.string().transform((str) => new Date(str)),
  endDate: z.string().nullable().transform((str) => str ? new Date(str) : null).optional(),
};

/**
 * Schema for creating a new project
 */
export const createProjectSchema = z.object({
  ...projectBaseSchema,
});

/**
 * Schema for updating an existing project
 */
export const updateProjectSchema = z.object({
  name: projectBaseSchema.name.optional(),
  description: projectBaseSchema.description,
  companyId: projectBaseSchema.companyId,
  status: projectBaseSchema.status.optional(),
  startDate: projectBaseSchema.startDate.optional(),
  endDate: projectBaseSchema.endDate,
});

/**
 * Type for creating a new project
 */
export type CreateProjectInput = z.infer<typeof createProjectSchema>;

/**
 * Type for updating an existing project
 */
export type UpdateProjectInput = z.infer<typeof updateProjectSchema>;

/**
 * Type for project with computed fields
 */
export interface ProjectWithComputed extends Project {
  durationInDays?: number;
  isActive?: boolean;
}
