import { drizzle } from 'drizzle-orm/neon-http';
import { config } from 'dotenv';
import { neon } from '@neondatabase/serverless';

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

const sql = neon(dbUrl);
export const db = drizzle(sql);

// Re-export all schema types and tables
export * from './schema';

// Re-export query functions (excluding duplicate types)
export {
  getUser,
  getUserById,
  createUser,
  saveChat,
  deleteChatById,
  getChatsByUserId,
  getChatById,
  saveMessages,
  getMessagesByChatId,
  voteMessage,
  getVotesByChatId,
  saveDocument,
  getDocumentsById,
  getDocumentById,
  getDocumentByShareToken,
  updateDocument,
  deleteDocumentsByIdAfterTimestamp,
  saveSuggestions,
  getSuggestionsByDocumentId,
  getMessageById,
  deleteMessagesByChatIdAfterTimestamp,
  updateChatVisibilityById,
  createUserMessage,
  createAchievement,
  getAchievementsByUserId,
  generatePeriodSummary,
  getAchievements,
  updateAchievement,
  deleteAchievement,
  getCompaniesByUserId,
  getCompanyById,
  createCompany,
  updateCompany,
  deleteCompany,
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
export type { AchievementStats } from './queries';
