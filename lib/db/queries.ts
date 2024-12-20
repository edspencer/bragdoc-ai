import { genSaltSync, hashSync } from "bcrypt-ts";
import { and, asc, between, desc, eq, gt, gte, type InferSelectModel, lte, sql } from "drizzle-orm";
import { db as defaultDb } from "@/lib/db";
import { CreateAchievementRequest, UpdateAchievementRequest } from "@/lib/types/achievement";

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
  brag,
  type UserMessage as UserMessageType,
  type Brag as BragType,
  company
} from "./schema";

// Optionally, if not using email/pass login, you can
// use the Drizzle adapter for Auth.js / NextAuth
// https://authjs.dev/reference/adapter/drizzle

export async function getUser(email: string, dbInstance = defaultDb): Promise<Array<User>> {
  try {
    return await dbInstance.select().from(user).where(eq(user.email, email));
  } catch (error) {
    console.error('Error in getUser:', error);
    throw error;
  }
}

export async function createUser(email: string, password: string, dbInstance = defaultDb) {
  const salt = genSaltSync(10);
  const hash = hashSync(password, salt);

  try {
    return await dbInstance.insert(user).values({ email, password: hash });
  } catch (error) {
    console.error('Error in createUser:', error);
    throw error;
  }
}

export async function saveChat({ id, userId, title }: { id: string; userId: string; title: string }, dbInstance = defaultDb) {
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

export async function deleteChatById({ id }: { id: string }, dbInstance = defaultDb) {
  try {
    await dbInstance.delete(vote).where(eq(vote.chatId, id));
    await dbInstance.delete(message).where(eq(message.chatId, id));

    return await dbInstance.delete(chat).where(eq(chat.id, id));
  } catch (error) {
    console.error('Error in deleteChatById:', error);
    throw error;
  }
}

export async function getChatsByUserId({ id }: { id: string }, dbInstance = defaultDb) {
  try {
    return await dbInstance.select().from(chat).where(eq(chat.userId, id)).orderBy(desc(chat.createdAt));
  } catch (error) {
    console.error('Error in getChatsByUserId:', error);
    throw error;
  }
}

export async function getChatById({ id }: { id: string }, dbInstance = defaultDb) {
  try {
    const [selectedChat] = await dbInstance.select().from(chat).where(eq(chat.id, id));
    return selectedChat;
  } catch (error) {
    console.error('Error in getChatById:', error);
    throw error;
  }
}

export async function saveMessages({ messages }: { messages: Array<Message> }, dbInstance = defaultDb) {
  try {
    return await dbInstance.insert(message).values(messages);
  } catch (error) {
    console.error('Error in saveMessages:', error);
    throw error;
  }
}

export async function getMessagesByChatId({ id }: { id: string }, dbInstance = defaultDb) {
  try {
    return await dbInstance.select().from(message).where(eq(message.chatId, id)).orderBy(asc(message.createdAt));
  } catch (error) {
    console.error('Error in getMessagesByChatId:', error);
    throw error;
  }
}

export async function voteMessage({
  chatId,
  messageId,
  type,
}: {
  chatId: string;
  messageId: string;
  type: "up" | "down";
}, dbInstance = defaultDb) {
  try {
    const [existingVote] = await dbInstance
      .select()
      .from(vote)
      .where(and(eq(vote.messageId, messageId)));

    if (existingVote) {
      return await dbInstance
        .update(vote)
        .set({ isUpvoted: type === "up" })
        .where(and(eq(vote.messageId, messageId), eq(vote.chatId, chatId)));
    }
    return await dbInstance.insert(vote).values({
      chatId,
      messageId,
      isUpvoted: type === "up",
    });
  } catch (error) {
    console.error('Error in voteMessage:', error);
    throw error;
  }
}

export async function getVotesByChatId({ id }: { id: string }, dbInstance = defaultDb) {
  try {
    return await dbInstance.select().from(vote).where(eq(vote.chatId, id));
  } catch (error) {
    console.error('Error in getVotesByChatId:', error);
    throw error;
  }
}

export async function saveDocument({
  id,
  title,
  content,
  userId,
}: {
  id: string;
  title: string;
  content: string;
  userId: string;
}, dbInstance = defaultDb) {
  try {
    return await dbInstance.insert(document).values({
      id,
      title,
      content,
      userId,
      createdAt: new Date(),
    });
  } catch (error) {
    console.error('Error in saveDocument:', error);
    throw error;
  }
}

export async function getDocumentsById({ id }: { id: string }, dbInstance = defaultDb) {
  try {
    const documents = await dbInstance.select().from(document).where(eq(document.id, id)).orderBy(asc(document.createdAt));

    return documents;
  } catch (error) {
    console.error('Error in getDocumentsById:', error);
    throw error;
  }
}

export async function getDocumentById({ id }: { id: string }, dbInstance = defaultDb) {
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

export async function deleteDocumentsByIdAfterTimestamp({ id, timestamp }: { id: string; timestamp: Date }, dbInstance = defaultDb) {
  try {
    await dbInstance.delete(suggestion).where(and(eq(suggestion.documentId, id), gt(suggestion.documentCreatedAt, timestamp)));

    return await dbInstance.delete(document).where(and(eq(document.id, id), gt(document.createdAt, timestamp)));
  } catch (error) {
    console.error('Error in deleteDocumentsByIdAfterTimestamp:', error);
    throw error;
  }
}

export async function saveSuggestions({ suggestions }: { suggestions: Array<Suggestion> }, dbInstance = defaultDb) {
  try {
    return await dbInstance.insert(suggestion).values(suggestions);
  } catch (error) {
    console.error('Error in saveSuggestions:', error);
    throw error;
  }
}

export async function getSuggestionsByDocumentId({ documentId }: { documentId: string }, dbInstance = defaultDb) {
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

export async function getMessageById({ id }: { id: string }, dbInstance = defaultDb) {
  try {
    return await dbInstance.select().from(message).where(eq(message.id, id));
  } catch (error) {
    console.error('Error in getMessageById:', error);
    throw error;
  }
}

export async function deleteMessagesByChatIdAfterTimestamp({ chatId, timestamp }: { chatId: string; timestamp: Date }, dbInstance = defaultDb) {
  try {
    return await dbInstance.delete(message).where(and(eq(message.chatId, chatId), gte(message.createdAt, timestamp)));
  } catch (error) {
    console.error('Error in deleteMessagesByChatIdAfterTimestamp:', error);
    throw error;
  }
}

export async function updateChatVisiblityById({
  chatId,
  visibility,
}: {
  chatId: string;
  visibility: "private" | "public";
}, dbInstance = defaultDb) {
  try {
    return await dbInstance.update(chat).set({ visibility }).where(eq(chat.id, chatId));
  } catch (error) {
    console.error('Error in updateChatVisiblityById:', error);
    throw error;
  }
}

export async function createUserMessage({
  userId,
  originalText,
}: {
  userId: string;
  originalText: string;
}, dbInstance = defaultDb): Promise<UserMessageType[]> {
  try {
    return await dbInstance.insert(userMessage).values({
      userId,
      originalText,
    }).returning();
  } catch (error) {
    console.error('Error in createUserMessage:', error);
    throw error;
  }
}

export async function createBrag({
  userId,
  userMessageId,
  eventStart,
  eventEnd,
  eventDuration,
  summary,
  title,
  details,
  companyId,
  projectId
}: {
  userId: string;
  userMessageId: string;
  eventStart: Date | null;
  eventEnd: Date | null;
  eventDuration: 'day' | 'week' | 'month' | 'quarter' | 'half year' | 'year';
  summary?: string;
  title: string;
  details?: string;
  companyId: string | null;
  projectId: string | null;
}, dbInstance = defaultDb): Promise<BragType[]> {
  try {
    return await dbInstance.insert(brag).values({
      userId,
      userMessageId,
      eventStart,
      eventEnd,
      eventDuration,
      summary,
      title,
      details,
      companyId,
      projectId
    }).returning();
  } catch (error) {
    console.error('Error in createBrag:', error);
    throw error;
  }
}

export async function getBragsByUserId({
  userId,
  limit = 50,
  offset = 0,
}: {
  userId: string;
  limit?: number;
  offset?: number;
}, dbInstance = defaultDb): Promise<BragType[]> {
  try {
    return await dbInstance.select()
      .from(brag)
      .where(eq(brag.userId, userId))
      .limit(limit)
      .offset(offset)
      .orderBy(desc(brag.eventStart));
  } catch (error) {
    console.error('Error in getBragsByUserId:', error);
    throw error;
  }
}

export async function generatePeriodSummary({
  userId,
  startDate,
  endDate,
}: {
  userId: string;
  startDate: Date;
  endDate: Date;
}, dbInstance = defaultDb): Promise<BragType[]> {
  try {
    return await dbInstance.select()
      .from(brag)
      .where(
        and(
          eq(brag.userId, userId),
          gte(brag.eventStart, startDate),
          lte(brag.eventEnd, endDate)
        )
      )
      .orderBy(desc(brag.eventStart));
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
  db = defaultDb
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
  db?: any;
}) {
  try {
    const conditions = [eq(brag.userId, userId)];

    if (companyId) {
      conditions.push(eq(brag.companyId, companyId));
    }
    if (projectId) {
      conditions.push(eq(brag.projectId, projectId));
    }
    if (source) {
      conditions.push(eq(brag.source, source));
    }
    if (typeof isArchived === 'boolean') {
      conditions.push(eq(brag.isArchived, isArchived));
    }
    if (startDate && endDate) {
      conditions.push(
        between(brag.eventStart, startDate, endDate)
      );
    }

    const achievements = await db
      .select()
      .from(brag)
      .where(and(...conditions))
      .limit(limit)
      .offset(offset)
      .orderBy(desc(brag.eventStart));

    const [{ count }] = await db
      .select({ count: sql<number>`count(*)` })
      .from(brag)
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
  db = defaultDb
}: {
  id: string;
  userId: string;
  data: UpdateAchievementRequest;
  db?: any;
}): Promise<BragType[]> {
  try {
    return await db
      .update(brag)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(brag.id, id),
          eq(brag.userId, userId)
        )
      )
      .returning();
  } catch (error) {
    console.error('Error in updateAchievement:', error);
    throw error;
  }
}

export async function deleteAchievement({
  id,
  userId,
  db = defaultDb
}: {
  id: string;
  userId: string;
  db?: any;
}): Promise<BragType[]> {
  try {
    return await db
      .delete(brag)
      .where(
        and(
          eq(brag.id, id),
          eq(brag.userId, userId)
        )
      )
      .returning();
  } catch (error) {
    console.error('Error in deleteAchievement:', error);
    throw error;
  }
}

export async function createAchievement(
  userId: string,
  data: CreateAchievementRequest,
  source: 'llm' | 'manual' = 'manual',
  userMessageId?: string,
  db = defaultDb
) {
  return await db.insert(brag).values({
    ...data,
    userId,
    userMessageId,
    source,
  }).returning().then(rows => rows[0]);
}

// Company Types
export type Company = InferSelectModel<typeof company>;
export type CreateCompanyInput = Pick<Company, 'userId' | 'name' | 'domain' | 'role' | 'startDate' | 'endDate'>;
export type UpdateCompanyInput = Partial<Omit<Company, 'id' | 'userId'>>;

// Company Queries
export async function getCompaniesByUserId({ 
  userId,
  limit = 50,
  offset = 0,
  db = defaultDb
}: { 
  userId: string;
  limit?: number;
  offset?: number;
  db?: any;
}): Promise<Company[]> {
  try {
    return await db.select()
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
  db = defaultDb
}: { 
  id: string;
  userId: string;
  db?: any;
}): Promise<Company | null> {
  try {
    const [selectedCompany] = await db.select()
      .from(company)
      .where(and(
        eq(company.id, id),
        eq(company.userId, userId)
      ));
    return selectedCompany || null;
  } catch (error) {
    console.error('Error in getCompanyById:', error);
    throw error;
  }
}

export async function createCompany(
  input: CreateCompanyInput, 
  db = defaultDb
): Promise<Company[]> {
  try {
    return await db.insert(company)
      .values(input)
      .returning();
  } catch (error) {
    console.error('Error in createCompany:', error);
    throw error;
  }
}

export async function updateCompany({ 
  id,
  userId,
  data,
  db = defaultDb
}: { 
  id: string;
  userId: string;
  data: UpdateCompanyInput;
  db?: any;
}): Promise<Company[]> {
  try {
    // Get the current company first
    const [currentCompany] = await db.select()
      .from(company)
      .where(and(
        eq(company.id, id),
        eq(company.userId, userId)
      ));

    if (!currentCompany) {
      return [];
    }

    // Merge current data with updates
    const updateData = {
      ...currentCompany,
      ...data,
      id: currentCompany.id, // Ensure we don't override the ID
      userId: currentCompany.userId // Ensure we don't override the user ID
    };

    return await db.update(company)
      .set(updateData)
      .where(and(
        eq(company.id, id),
        eq(company.userId, userId)
      ))
      .returning();
  } catch (error) {
    console.error('Error in updateCompany:', error);
    throw error;
  }
}

export async function deleteCompany({ 
  id,
  userId,
  db = defaultDb
}: { 
  id: string;
  userId: string;
  db?: any;
}): Promise<Company[]> {
  try {
    return await db.delete(company)
      .where(and(
        eq(company.id, id),
        eq(company.userId, userId)
      ))
      .returning();
  } catch (error) {
    console.error('Error in deleteCompany:', error);
    throw error;
  }
}
