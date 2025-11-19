/**
 * Shared User Data Import Library
 *
 * Provides reusable import functionality for both regular user imports
 * and demo account data population.
 */

import crypto from 'node:crypto';
import { db } from '@/database/index';
import { achievement, company, project, document } from '@/database/schema';
import { eq, and } from 'drizzle-orm';
import type { z } from 'zod';
import type { exportDataSchema } from './export-import-schema';

export interface ImportOptions {
  userId: string;
  data: z.infer<typeof exportDataSchema>;
  checkDuplicates?: boolean; // true for normal import, false for demo (default: true)
  generateNewIds?: boolean; // true for demo imports to avoid ID collisions (default: false)
}

export interface ImportStats {
  companies: { created: number; skipped: number };
  projects: { created: number; skipped: number };
  achievements: { created: number; skipped: number };
  documents: { created: number; skipped: number };
}

/**
 * Imports user data (companies, projects, achievements, documents)
 * Order matters due to foreign key relationships:
 * 1. Companies (no dependencies)
 * 2. Projects (depend on companies)
 * 3. Achievements (depend on companies and projects)
 * 4. Documents (depend on companies)
 *
 * @param options - Import configuration including userId, data, and duplicate checking
 * @returns Statistics about created and skipped items
 */
export async function importUserData(
  options: ImportOptions,
): Promise<ImportStats> {
  const {
    userId,
    data: importData,
    checkDuplicates = true,
    generateNewIds = false,
  } = options;

  const stats: ImportStats = {
    companies: { created: 0, skipped: 0 },
    projects: { created: 0, skipped: 0 },
    achievements: { created: 0, skipped: 0 },
    documents: { created: 0, skipped: 0 },
  };

  // ID mappings for foreign key updates when generating new IDs
  const companyIdMap = new Map<string, string>();
  const projectIdMap = new Map<string, string>();

  // IMPORTANT: Order matters due to foreign key relationships
  // 1. Companies (no dependencies)
  // 2. Projects (depend on companies)
  // 3. Achievements (depend on companies and projects)
  // 4. Documents (depend on companies)

  // Import companies
  if (!checkDuplicates) {
    // Batch insert for demo mode (much faster)
    const companiesToInsert = importData.companies.map((companyData) => {
      const newCompanyId = generateNewIds
        ? crypto.randomUUID()
        : companyData.id;

      // Store ID mapping for foreign key updates
      if (generateNewIds) {
        companyIdMap.set(companyData.id, newCompanyId);
      }

      return {
        id: newCompanyId,
        userId,
        name: companyData.name,
        domain: companyData.domain,
        role: companyData.role,
        startDate: new Date(companyData.startDate),
        endDate: companyData.endDate ? new Date(companyData.endDate) : null,
      };
    });

    if (companiesToInsert.length > 0) {
      await db.insert(company).values(companiesToInsert);
      stats.companies.created = companiesToInsert.length;
    }
  } else {
    // Sequential insert with duplicate checking (normal imports)
    for (const companyData of importData.companies) {
      const newCompanyId = generateNewIds
        ? crypto.randomUUID()
        : companyData.id;

      const existing = await db
        .select()
        .from(company)
        .where(and(eq(company.id, newCompanyId), eq(company.userId, userId)));

      if (existing.length > 0) {
        stats.companies.skipped++;
        continue;
      }

      // Store ID mapping for foreign key updates
      if (generateNewIds) {
        companyIdMap.set(companyData.id, newCompanyId);
      }

      await db.insert(company).values({
        id: newCompanyId,
        userId,
        name: companyData.name,
        domain: companyData.domain,
        role: companyData.role,
        startDate: new Date(companyData.startDate),
        endDate: companyData.endDate ? new Date(companyData.endDate) : null,
      });
      stats.companies.created++;
    }
  }

  // Import projects
  if (!checkDuplicates) {
    // Batch insert for demo mode
    const projectsToInsert = importData.projects.map((projectData) => {
      const newProjectId = generateNewIds
        ? crypto.randomUUID()
        : projectData.id;
      const newCompanyId =
        generateNewIds && projectData.companyId
          ? companyIdMap.get(projectData.companyId) || projectData.companyId
          : projectData.companyId;

      // Store ID mapping for foreign key updates
      if (generateNewIds) {
        projectIdMap.set(projectData.id, newProjectId);
      }

      return {
        id: newProjectId,
        userId,
        companyId: newCompanyId,
        name: projectData.name,
        description: projectData.description,
        status: projectData.status,
        color: projectData.color,
        startDate: new Date(projectData.startDate),
        endDate: projectData.endDate ? new Date(projectData.endDate) : null,
        repoRemoteUrl: projectData.repoRemoteUrl,
        createdAt: new Date(projectData.createdAt),
        updatedAt: new Date(projectData.updatedAt),
      };
    });

    if (projectsToInsert.length > 0) {
      await db.insert(project).values(projectsToInsert);
      stats.projects.created = projectsToInsert.length;
    }
  } else {
    // Sequential insert with duplicate checking
    for (const projectData of importData.projects) {
      const newProjectId = generateNewIds
        ? crypto.randomUUID()
        : projectData.id;
      const newCompanyId =
        generateNewIds && projectData.companyId
          ? companyIdMap.get(projectData.companyId) || projectData.companyId
          : projectData.companyId;

      const existing = await db
        .select()
        .from(project)
        .where(and(eq(project.id, newProjectId), eq(project.userId, userId)));

      if (existing.length > 0) {
        stats.projects.skipped++;
        continue;
      }

      // Store ID mapping for foreign key updates
      if (generateNewIds) {
        projectIdMap.set(projectData.id, newProjectId);
      }

      await db.insert(project).values({
        id: newProjectId,
        userId,
        companyId: newCompanyId,
        name: projectData.name,
        description: projectData.description,
        status: projectData.status,
        color: projectData.color,
        startDate: new Date(projectData.startDate),
        endDate: projectData.endDate ? new Date(projectData.endDate) : null,
        repoRemoteUrl: projectData.repoRemoteUrl,
        createdAt: new Date(projectData.createdAt),
        updatedAt: new Date(projectData.updatedAt),
      });
      stats.projects.created++;
    }
  }

  // Import achievements
  if (!checkDuplicates) {
    // Batch insert for demo mode (much faster for 500+ achievements)
    const achievementsToInsert = importData.achievements.map(
      (achievementData) => {
        const newAchievementId = generateNewIds
          ? crypto.randomUUID()
          : achievementData.id;
        const newCompanyId =
          generateNewIds && achievementData.companyId
            ? companyIdMap.get(achievementData.companyId) ||
              achievementData.companyId
            : achievementData.companyId;
        const newProjectId =
          generateNewIds && achievementData.projectId
            ? projectIdMap.get(achievementData.projectId) ||
              achievementData.projectId
            : achievementData.projectId;

        return {
          id: newAchievementId,
          userId,
          companyId: newCompanyId,
          projectId: newProjectId,
          userMessageId: achievementData.userMessageId,
          title: achievementData.title,
          summary: achievementData.summary,
          details: achievementData.details,
          eventStart: achievementData.eventStart
            ? new Date(achievementData.eventStart)
            : null,
          eventEnd: achievementData.eventEnd
            ? new Date(achievementData.eventEnd)
            : null,
          eventDuration: achievementData.eventDuration,
          isArchived: achievementData.isArchived ?? false,
          source: achievementData.source,
          impact: achievementData.impact,
          impactSource: achievementData.impactSource ?? 'user',
          impactUpdatedAt: achievementData.impactUpdatedAt
            ? new Date(achievementData.impactUpdatedAt)
            : new Date(),
          createdAt: new Date(achievementData.createdAt),
          updatedAt: new Date(achievementData.updatedAt),
          // Include pre-computed embeddings if present (demo data optimization)
          ...(achievementData.embedding && {
            embedding: achievementData.embedding as unknown as any,
            embeddingModel: achievementData.embeddingModel,
            embeddingGeneratedAt: achievementData.embeddingGeneratedAt
              ? new Date(achievementData.embeddingGeneratedAt)
              : null,
          }),
        };
      },
    );

    if (achievementsToInsert.length > 0) {
      await db.insert(achievement).values(achievementsToInsert);
      stats.achievements.created = achievementsToInsert.length;
    }
  } else {
    // Sequential insert with duplicate checking
    for (const achievementData of importData.achievements) {
      const newAchievementId = generateNewIds
        ? crypto.randomUUID()
        : achievementData.id;
      const newCompanyId =
        generateNewIds && achievementData.companyId
          ? companyIdMap.get(achievementData.companyId) ||
            achievementData.companyId
          : achievementData.companyId;
      const newProjectId =
        generateNewIds && achievementData.projectId
          ? projectIdMap.get(achievementData.projectId) ||
            achievementData.projectId
          : achievementData.projectId;

      const existing = await db
        .select()
        .from(achievement)
        .where(
          and(
            eq(achievement.id, newAchievementId),
            eq(achievement.userId, userId),
          ),
        );

      if (existing.length > 0) {
        stats.achievements.skipped++;
        continue;
      }

      await db.insert(achievement).values({
        id: newAchievementId,
        userId,
        companyId: newCompanyId,
        projectId: newProjectId,
        userMessageId: achievementData.userMessageId,
        title: achievementData.title,
        summary: achievementData.summary,
        details: achievementData.details,
        eventStart: achievementData.eventStart
          ? new Date(achievementData.eventStart)
          : null,
        eventEnd: achievementData.eventEnd
          ? new Date(achievementData.eventEnd)
          : null,
        eventDuration: achievementData.eventDuration,
        isArchived: achievementData.isArchived ?? false,
        source: achievementData.source,
        impact: achievementData.impact,
        impactSource: achievementData.impactSource ?? 'user',
        impactUpdatedAt: achievementData.impactUpdatedAt
          ? new Date(achievementData.impactUpdatedAt)
          : new Date(),
        createdAt: new Date(achievementData.createdAt),
        updatedAt: new Date(achievementData.updatedAt),
        // Include pre-computed embeddings if present (demo data optimization)
        ...(achievementData.embedding && {
          embedding: achievementData.embedding as unknown as any,
          embeddingModel: achievementData.embeddingModel,
          embeddingGeneratedAt: achievementData.embeddingGeneratedAt
            ? new Date(achievementData.embeddingGeneratedAt)
            : null,
        }),
      });
      stats.achievements.created++;
    }
  }

  // Import documents
  if (!checkDuplicates) {
    // Batch insert for demo mode
    const documentsToInsert = importData.documents.map((documentData) => {
      const newDocumentId = generateNewIds
        ? crypto.randomUUID()
        : documentData.id;
      const newCompanyId =
        generateNewIds && documentData.companyId
          ? companyIdMap.get(documentData.companyId) || documentData.companyId
          : documentData.companyId;

      return {
        id: newDocumentId,
        userId,
        companyId: newCompanyId,
        title: documentData.title,
        content: documentData.content,
        type: documentData.type,
        shareToken: documentData.shareToken,
        createdAt: new Date(documentData.createdAt),
        updatedAt: new Date(documentData.updatedAt),
      };
    });

    if (documentsToInsert.length > 0) {
      await db.insert(document).values(documentsToInsert);
      stats.documents.created = documentsToInsert.length;
    }
  } else {
    // Sequential insert with duplicate checking
    for (const documentData of importData.documents) {
      const newDocumentId = generateNewIds
        ? crypto.randomUUID()
        : documentData.id;
      const newCompanyId =
        generateNewIds && documentData.companyId
          ? companyIdMap.get(documentData.companyId) || documentData.companyId
          : documentData.companyId;

      const existing = await db
        .select()
        .from(document)
        .where(
          and(eq(document.id, newDocumentId), eq(document.userId, userId)),
        );

      if (existing.length > 0) {
        stats.documents.skipped++;
        continue;
      }

      await db.insert(document).values({
        id: newDocumentId,
        userId,
        companyId: newCompanyId,
        title: documentData.title,
        content: documentData.content,
        type: documentData.type,
        shareToken: documentData.shareToken,
        createdAt: new Date(documentData.createdAt),
        updatedAt: new Date(documentData.updatedAt),
      });
      stats.documents.created++;
    }
  }

  return stats;
}
