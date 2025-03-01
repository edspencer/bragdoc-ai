import { genSaltSync, hashSync } from 'bcrypt-ts';
import {
  and,
  asc,
  between,
  desc,
  eq,
  gt,
  gte,
  type InferSelectModel,
  lte,
  sql,
} from 'drizzle-orm';
import { db as defaultDb } from '@/lib/db';
import type { UpdateAchievementRequest } from '@/lib/types/achievement';

import {
  user,
  chat,
  type User,
  document,
  type Suggestion,
  suggestion,
  type Message,
  message,
  vote,
  userMessage,
  achievement,
  type UserMessage as UserMessageType,
  type Achievement,
  company,
  project,
  cliToken,
} from './schema';

// Optionally, if not using email/pass login, you can
// use the Drizzle adapter for Auth.js / NextAuth
// https://authjs.dev/reference/adapter/drizzle

export async function getUser(
  email: string,
  dbInstance = defaultDb,
): Promise<Array<User>> {
  try {
    return await dbInstance.select().from(user).where(eq(user.email, email));
  } catch (error) {
    console.error('Error in getUser:', error);
    throw error;
  }
}

export async function getUserById(
  id: string,
  dbInstance = defaultDb,
): Promise<User | null> {
  try {
    const users = await dbInstance.select().from(user).where(eq(user.id, id));
    return users[0] || null;
  } catch (error) {
    console.error('Error in getUserById:', error);
    throw error;
  }
}

export async function createUser(
  email: string,
  password: string,
  dbInstance = defaultDb,
): Promise<User> {
  const salt = genSaltSync(10);
  const hash = hashSync(password, salt);

  try {
    const [newUser] = await dbInstance
      .insert(user)
      .values({ email, password: hash })
      .returning();
    return newUser;
  } catch (error) {
    console.error('Error in createUser:', error);
    throw error;
  }
}

export async function saveChat(
  { id, userId, title }: { id: string; userId: string; title: string },
  dbInstance = defaultDb,
) {
  try {
    return await dbInstance.insert(chat).values({
      id,
      createdAt: new Date(),
      userId,
      title,
    });
  } catch (error) {
    console.error('Error in saveChat:', error);
    throw error;
  }
}

export async function deleteChatById(
  { id }: { id: string },
  dbInstance = defaultDb,
) {
  try {
    await dbInstance.delete(vote).where(eq(vote.chatId, id));
    await dbInstance.delete(message).where(eq(message.chatId, id));

    return await dbInstance.delete(chat).where(eq(chat.id, id));
  } catch (error) {
    console.error('Error in deleteChatById:', error);
    throw error;
  }
}

export async function getChatsByUserId(
  { id }: { id: string },
  dbInstance = defaultDb,
) {
  try {
    return await dbInstance
      .select()
      .from(chat)
      .where(eq(chat.userId, id))
      .orderBy(desc(chat.createdAt));
  } catch (error) {
    console.error('Error in getChatsByUserId:', error);
    throw error;
  }
}

export async function getChatById(
  { id }: { id: string },
  dbInstance = defaultDb,
) {
  try {
    const [selectedChat] = await dbInstance
      .select()
      .from(chat)
      .where(eq(chat.id, id));
    return selectedChat;
  } catch (error) {
    console.error('Error in getChatById:', error);
    throw error;
  }
}

export async function saveMessages(
  { messages }: { messages: Array<Message> },
  dbInstance = defaultDb,
) {
  try {
    return await dbInstance.insert(message).values(messages);
  } catch (error) {
    console.error('Error in saveMessages:', error);
    throw error;
  }
}

export async function getMessagesByChatId(
  { id }: { id: string },
  dbInstance = defaultDb,
) {
  try {
    return await dbInstance
      .select()
      .from(message)
      .where(eq(message.chatId, id))
      .orderBy(asc(message.createdAt));
  } catch (error) {
    console.error('Error in getMessagesByChatId:', error);
    throw error;
  }
}

export async function voteMessage(
  {
    chatId,
    messageId,
    type,
  }: {
    chatId: string;
    messageId: string;
    type: 'up' | 'down';
  },
  dbInstance = defaultDb,
) {
  try {
    const [existingVote] = await dbInstance
      .select()
      .from(vote)
      .where(and(eq(vote.messageId, messageId)));

    if (existingVote) {
      return await dbInstance
        .update(vote)
        .set({ isUpvoted: type === 'up' })
        .where(and(eq(vote.messageId, messageId), eq(vote.chatId, chatId)));
    }
    return await dbInstance.insert(vote).values({
      chatId,
      messageId,
      isUpvoted: type === 'up',
    });
  } catch (error) {
    console.error('Error in voteMessage:', error);
    throw error;
  }
}

export async function getVotesByChatId(
  { id }: { id: string },
  dbInstance = defaultDb,
) {
  try {
    return await dbInstance.select().from(vote).where(eq(vote.chatId, id));
  } catch (error) {
    console.error('Error in getVotesByChatId:', error);
    throw error;
  }
}

export async function saveDocument(
  {
    id,
    title,
    content,
    userId,
    type,
    companyId,
  }: {
    id: string;
    title: string;
    content: string;
    userId: string;
    type?: string;
    companyId?: string;
  },
  dbInstance = defaultDb,
) {
  try {
    return await dbInstance.insert(document).values({
      id,
      title,
      content,
      userId,
      type,
      companyId,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  } catch (error) {
    console.error('Error in saveDocument:', error);
    throw error;
  }
}

export async function getDocumentsById(
  { id }: { id: string },
  dbInstance = defaultDb,
) {
  try {
    return await dbInstance
      .select()
      .from(document)
      .where(eq(document.id, id))
      .orderBy(asc(document.createdAt));
  } catch (error) {
    console.error('Error in getDocumentsById:', error);
    throw error;
  }
}

export async function getDocumentById(
  { id }: { id: string },
  dbInstance = defaultDb,
) {
  try {
    const [selectedDocument] = await dbInstance
      .select()
      .from(document)
      .where(eq(document.id, id))
      .orderBy(desc(document.createdAt));

    return selectedDocument;
  } catch (error) {
    console.error('Error in getDocumentById:', error);
    throw error;
  }
}

export async function getDocumentByShareToken(
  { token }: { token: string },
  dbInstance = defaultDb,
) {
  try {
    const [selectedDocument] = await dbInstance
      .select()
      .from(document)
      .where(eq(document.shareToken, token))
      .leftJoin(company, eq(document.companyId, company.id));

    return selectedDocument;
  } catch (error) {
    console.error('Error in getDocumentByShareToken:', error);
    throw error;
  }
}

export async function updateDocument(
  {
    id,
    userId,
    data,
  }: {
    id: string;
    userId: string;
    data: {
      title?: string;
      content?: string;
      type?: string;
      companyId?: string | null;
      shareToken?: string | null;
    };
  },
  dbInstance = defaultDb,
) {
  try {
    const [updated] = await dbInstance
      .update(document)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(and(eq(document.id, id), eq(document.userId, userId)))
      .returning();

    return updated;
  } catch (error) {
    console.error('Error in updateDocument:', error);
    throw error;
  }
}

export async function deleteDocumentsByIdAfterTimestamp(
  { id, timestamp }: { id: string; timestamp: Date },
  dbInstance = defaultDb,
) {
  try {
    await dbInstance
      .delete(suggestion)
      .where(
        and(
          eq(suggestion.documentId, id),
          gt(suggestion.documentCreatedAt, timestamp),
        ),
      );

    return await dbInstance
      .delete(document)
      .where(and(eq(document.id, id), gt(document.createdAt, timestamp)));
  } catch (error) {
    console.error('Error in deleteDocumentsByIdAfterTimestamp:', error);
    throw error;
  }
}

export async function saveSuggestions(
  { suggestions }: { suggestions: Array<Suggestion> },
  dbInstance = defaultDb,
) {
  try {
    return await dbInstance.insert(suggestion).values(suggestions);
  } catch (error) {
    console.error('Error in saveSuggestions:', error);
    throw error;
  }
}

export async function getSuggestionsByDocumentId(
  { documentId }: { documentId: string },
  dbInstance = defaultDb,
) {
  try {
    return await dbInstance
      .select()
      .from(suggestion)
      .where(and(eq(suggestion.documentId, documentId)));
  } catch (error) {
    console.error('Error in getSuggestionsByDocumentId:', error);
    throw error;
  }
}

export async function getMessageById(
  { id }: { id: string },
  dbInstance = defaultDb,
) {
  try {
    return await dbInstance.select().from(message).where(eq(message.id, id));
  } catch (error) {
    console.error('Error in getMessageById:', error);
    throw error;
  }
}

export async function deleteMessagesByChatIdAfterTimestamp(
  { chatId, timestamp }: { chatId: string; timestamp: Date },
  dbInstance = defaultDb,
) {
  try {
    return await dbInstance
      .delete(message)
      .where(
        and(eq(message.chatId, chatId), gte(message.createdAt, timestamp)),
      );
  } catch (error) {
    console.error('Error in deleteMessagesByChatIdAfterTimestamp:', error);
    throw error;
  }
}

export async function updateChatVisiblityById(
  {
    chatId,
    visibility,
  }: {
    chatId: string;
    visibility: 'private' | 'public';
  },
  dbInstance = defaultDb,
) {
  try {
    return await dbInstance
      .update(chat)
      .set({ visibility })
      .where(eq(chat.id, chatId));
  } catch (error) {
    console.error('Error in updateChatVisiblityById:', error);
    throw error;
  }
}

export async function createUserMessage(
  {
    userId,
    originalText,
  }: {
    userId: string;
    originalText: string;
  },
  dbInstance = defaultDb,
): Promise<UserMessageType[]> {
  try {
    return await dbInstance
      .insert(userMessage)
      .values({
        userId,
        originalText,
      })
      .returning();
  } catch (error) {
    console.error('Error in createUserMessage:', error);
    throw error;
  }
}

export async function createAchievement(
  data: Omit<typeof achievement.$inferInsert, 'id' | 'createdAt' | 'updatedAt'>,
  dbInstance = defaultDb,
): Promise<Achievement[]> {
  try {
    return await dbInstance.insert(achievement).values(data).returning();
  } catch (error) {
    console.error('Error in createAchievement:', error);
    throw error;
  }
}

export async function getAchievementsByUserId(
  {
    userId,
    limit = 50,
    offset = 0,
  }: {
    userId: string;
    limit?: number;
    offset?: number;
  },
  dbInstance = defaultDb,
): Promise<Achievement[]> {
  try {
    return await dbInstance
      .select()
      .from(achievement)
      .where(eq(achievement.userId, userId))
      .orderBy(desc(achievement.createdAt))
      .limit(limit)
      .offset(offset);
  } catch (error) {
    console.error('Error in getAchievementsByUserId:', error);
    throw error;
  }
}

export async function generatePeriodSummary(
  {
    userId,
    startDate,
    endDate,
  }: {
    userId: string;
    startDate: Date;
    endDate: Date;
  },
  dbInstance = defaultDb,
): Promise<Achievement[]> {
  try {
    return await dbInstance
      .select()
      .from(achievement)
      .where(
        and(
          eq(achievement.userId, userId),
          gte(achievement.eventStart, startDate),
          lte(achievement.eventEnd, endDate),
        ),
      )
      .orderBy(asc(achievement.eventStart));
  } catch (error) {
    console.error('Error in generatePeriodSummary:', error);
    throw error;
  }
}

export async function getAchievements({
  userId,
  companyId,
  projectId,
  source,
  isArchived,
  startDate,
  endDate,
  limit = 10,
  offset = 0,
  db = defaultDb,
}: {
  userId: string;
  companyId?: string | null;
  projectId?: string | null;
  source?: 'llm' | 'manual';
  isArchived?: boolean;
  startDate?: Date;
  endDate?: Date;
  limit?: number;
  offset?: number;
  db?: typeof defaultDb;
}) {
  try {
    const conditions = [eq(achievement.userId, userId)];

    if (companyId) {
      conditions.push(eq(achievement.companyId, companyId));
    }
    if (projectId) {
      conditions.push(eq(achievement.projectId, projectId));
    }
    if (source) {
      conditions.push(eq(achievement.source, source));
    }
    if (typeof isArchived === 'boolean') {
      conditions.push(eq(achievement.isArchived, isArchived));
    }
    if (startDate && endDate) {
      conditions.push(between(achievement.eventStart, startDate, endDate));
    }

    const achievements = await db
      .select({
        id: achievement.id,
        userId: achievement.userId,
        companyId: achievement.companyId,
        projectId: achievement.projectId,
        title: achievement.title,
        summary: achievement.summary,
        details: achievement.details,
        eventStart: achievement.eventStart,
        eventEnd: achievement.eventEnd,
        eventDuration: achievement.eventDuration,
        isArchived: achievement.isArchived,
        source: achievement.source,
        impact: achievement.impact,
        impactSource: achievement.impactSource,
        impactUpdatedAt: achievement.impactUpdatedAt,
        createdAt: achievement.createdAt,
        updatedAt: achievement.updatedAt,
        company: {
          id: company.id,
          name: company.name,
          userId: company.userId,
          domain: company.domain,
          role: company.role,
          startDate: company.startDate,
          endDate: company.endDate,
        },
        project: {
          id: project.id,
          name: project.name,
          description: project.description,
          status: project.status,
          startDate: project.startDate,
          endDate: project.endDate,
          createdAt: project.createdAt,
          updatedAt: project.updatedAt,
        },
        userMessage: {
          id: userMessage.id,
          originalText: userMessage.originalText,
          createdAt: userMessage.createdAt,
        },
      })
      .from(achievement)
      .leftJoin(company, eq(achievement.companyId, company.id))
      .leftJoin(project, eq(achievement.projectId, project.id))
      .leftJoin(userMessage, eq(achievement.userMessageId, userMessage.id))
      .where(and(...conditions))
      .limit(limit)
      .offset(offset)
      .orderBy(desc(achievement.eventStart), desc(achievement.createdAt));

    const [{ count }] = await db
      .select({ count: sql<number>`count(*)` })
      .from(achievement)
      .where(and(...conditions));

    return {
      achievements,
      total: Number(count),
    };
  } catch (error) {
    console.error('Error in getAchievements:', error);
    throw error;
  }
}

export async function updateAchievement({
  id,
  userId,
  data,
  db = defaultDb,
}: {
  id: string;
  userId: string;
  data: UpdateAchievementRequest;
  db?: any;
}): Promise<Achievement[]> {
  try {
    // Filter out undefined values and ensure impact is properly set
    const updateData = Object.fromEntries(
      Object.entries({
        ...data
      }).filter(([_, value]) => value !== undefined),
    );

    // Ensure impact is treated as a number
    if ('impact' in data) {
      updateData.impact = Number(data.impact);
    }

    return await db
      .update(achievement)
      .set(updateData)
      .where(and(eq(achievement.id, id), eq(achievement.userId, userId)))
      .returning();
  } catch (error) {
    console.error('Error in updateAchievement:', error);
    throw error;
  }
}

export async function deleteAchievement({
  id,
  userId,
  db = defaultDb,
}: {
  id: string;
  userId: string;
  db?: any;
}): Promise<Achievement[]> {
  try {
    return await db
      .delete(achievement)
      .where(and(eq(achievement.id, id), eq(achievement.userId, userId)))
      .returning();
  } catch (error) {
    console.error('Error in deleteAchievement:', error);
    throw error;
  }
}

/**
 * Validate a CLI token and return the associated user if valid
 */
export async function validateCLIToken(
  token: string,
  dbInstance = defaultDb,
): Promise<{ userId: string; isValid: boolean }> {
  try {
    const [cliTokenRecord] = await dbInstance
      .select()
      .from(cliToken)
      .where(eq(cliToken.token, token));

    if (!cliTokenRecord) {
      return { userId: '', isValid: false };
    }

    // Check if token has expired
    if (new Date(cliTokenRecord.expiresAt) < new Date()) {
      return { userId: '', isValid: false };
    }

    // Update last used timestamp
    await dbInstance
      .update(cliToken)
      .set({ lastUsedAt: new Date() })
      .where(eq(cliToken.id, cliTokenRecord.id));

    return { userId: cliTokenRecord.userId, isValid: true };
  } catch (error) {
    console.error('Error validating CLI token:', error);
    return { userId: '', isValid: false };
  }
}

// Type for an Achievement with its relations
export type AchievementWithRelations = Achievement & {
  company: InferSelectModel<typeof company> | null;
  project: InferSelectModel<typeof project> | null;
  userMessage: InferSelectModel<typeof userMessage> | null;
};

// Company Types
export type Company = InferSelectModel<typeof company>;
export type CreateCompanyInput = Pick<
  Company,
  'userId' | 'name' | 'domain' | 'role' | 'startDate' | 'endDate'
>;
export type UpdateCompanyInput = Partial<Omit<Company, 'id' | 'userId'>>;

// Company Queries
export async function getCompaniesByUserId({
  userId,
  limit = 50,
  offset = 0,
  db = defaultDb,
}: {
  userId: string;
  limit?: number;
  offset?: number;
  db?: any;
}): Promise<Company[]> {
  try {
    return await db
      .select()
      .from(company)
      .where(eq(company.userId, userId))
      .limit(limit)
      .offset(offset)
      .orderBy(desc(company.startDate));
  } catch (error) {
    console.error('Error in getCompaniesByUserId:', error);
    throw error;
  }
}

export async function getCompanyById({
  id,
  userId,
  db = defaultDb,
}: {
  id: string;
  userId: string;
  db?: any;
}): Promise<Company | null> {
  try {
    const [selectedCompany] = await db
      .select()
      .from(company)
      .where(and(eq(company.id, id), eq(company.userId, userId)));
    return selectedCompany || null;
  } catch (error) {
    console.error('Error in getCompanyById:', error);
    throw error;
  }
}

export async function createCompany(
  input: CreateCompanyInput,
  db = defaultDb,
): Promise<Company> {
  try {
    return (await db.insert(company).values(input).returning())[0];
  } catch (error) {
    console.error('Error in createCompany:', error);
    throw error;
  }
}

export async function updateCompany({
  id,
  userId,
  data,
  db = defaultDb,
}: {
  id: string;
  userId: string;
  data: UpdateCompanyInput;
  db?: any;
}): Promise<Company> {
  try {
    const [updated] = await db
      .update(company)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(and(eq(company.id, id), eq(company.userId, userId)))
      .returning();
    return updated;
  } catch (error) {
    console.error('Error in updateCompany:', error);
    throw error;
  }
}

export async function deleteCompany({
  id,
  userId,
  db = defaultDb,
}: {
  id: string;
  userId: string;
  db?: any;
}): Promise<Company> {
  try {
    const [deleted] = await db
      .delete(company)
      .where(and(eq(company.id, id), eq(company.userId, userId)))
      .returning();
    return deleted;
  } catch (error) {
    console.error('Error in deleteCompany:', error);
    throw error;
  }
}
