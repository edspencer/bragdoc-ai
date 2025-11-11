import { drizzle as drizzleNeon } from 'drizzle-orm/neon-http';
import { drizzle as drizzlePostgres } from 'drizzle-orm/postgres-js';
import { config } from 'dotenv';
import { neon } from '@neondatabase/serverless';
import postgres from 'postgres';

// Load environment variables
if (process.env.NODE_ENV === 'test') {
  config({ path: '.env.test' });
} else {
  config();
}

export const dbUrl = process.env.POSTGRES_URL!;

if (!dbUrl) {
  throw new Error('Database connection string not found');
}

// Use postgres-js for test environment, neon for production
const isTest = process.env.NODE_ENV === 'test';
export const db = isTest
  ? drizzlePostgres(postgres(dbUrl))
  : drizzleNeon(neon(dbUrl));

// Re-export all schema types and tables
export * from './schema';

// Re-export query functions (excluding duplicate types)
export {
  getUser,
  getUserById,
  saveChat,
  deleteChatById,
  getChatsByUserId,
  getChatById,
  saveMessages,
  getMessagesByChatId,
  saveDocument,
  getDocumentById,
  getDocumentByShareToken,
  updateDocument,
  getMessageById,
  deleteMessagesByChatIdAfterTimestamp,
  updateChatVisibilityById,
  updateChatLastContextById,
  createUserMessage,
  createAchievement,
  getAchievementsByUserId,
  generatePeriodSummary,
  getAchievements,
  updateAchievement,
  deleteAchievement,
  updateAchievementStandupDocument,
  bulkUpdateAchievementStandupDocument,
  getCompaniesByUserId,
  getCompanyById,
  createCompany,
  updateCompany,
  deleteCompany,
  getCompanyRelatedDataCounts,
  deleteCompanyWithCascade,
  getAchievementStats,
  getActiveProjectsCount,
} from './queries';

// Re-export project queries
export {
  getProjectsByUserId,
  getProjectById,
  createProject,
  updateProject,
  deleteProject,
  ensureProject,
} from './projects/queries';

// Re-export project types
export type {
  ProjectWithCompany,
  CreateProjectInput,
  UpdateProjectInput,
} from './projects/queries';

// Re-export types
export type {
  AchievementStats,
  RelatedDataCounts,
  CascadeDeleteOptions,
  DeleteCompanyResult,
} from './queries';

// Re-export standup queries
export {
  getStandupsByUserId,
  getStandupById,
  createStandup,
  updateStandup,
  deleteStandup,
  getStandupDocumentsByStandupId,
  getCurrentStandupDocument,
  getPreviousStandupDocument,
  getStandupDocumentByDate,
  createStandupDocument,
  updateStandupDocumentWip,
  updateStandupDocumentAchievementsSummary,
  updateStandupDocumentSummary,
  deleteStandupDocument,
  getRecentAchievementsForStandup,
  getUnassignedAchievementsForStandup,
} from './standups/queries';

// Re-export standup types
export type {
  StandupInsert,
  StandupWithRelations,
  StandupDocumentWithDetails,
  StandupDocumentUpdate,
} from './standups/types';

// Re-export workstreams queries
export {
  getWorkstreamsByUserId,
  getWorkstreamById,
  getAchievementsByWorkstreamId,
  getUnassignedAchievements,
  getWorkstreamMetadata,
  updateWorkstream,
  archiveWorkstream,
  getTotalAchievementCount,
  unassignAchievementsFromWorkstream,
  getAchievementsByUserIdWithDates,
  getAchievementCounts,
  getWorkstreamCountsWithDateFilter,
  getWorkstreamsByUserIdWithDateFilter,
} from './workstreams/queries';
