import { genSaltSync, hashSync } from "bcrypt-ts";
import { and, asc, desc, eq, gt, gte, InferSelectModel, lte } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

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

// biome-ignore lint: Forbidden non-null assertion.
const client = postgres(process.env.POSTGRES_URL!);
export const db = drizzle(client);

export async function getUser(email: string): Promise<Array<User>> {
  try {
    return await db.select().from(user).where(eq(user.email, email));
  } catch (error) {
    console.log(error);
    console.error("Failed to get user from database");
    throw error;
  }
}

export async function createUser(email: string, password: string) {
  const salt = genSaltSync(10);
  const hash = hashSync(password, salt);

  try {
    return await db.insert(user).values({ email, password: hash });
  } catch (error) {
    console.error("Failed to create user in database");
    throw error;
  }
}

export async function saveChat({ id, userId, title }: { id: string; userId: string; title: string }) {
  try {
    return await db.insert(chat).values({
      id,
      createdAt: new Date(),
      userId,
      title,
    });
  } catch (error) {
    console.error("Failed to save chat in database");
    throw error;
  }
}

export async function deleteChatById({ id }: { id: string }) {
  try {
    await db.delete(vote).where(eq(vote.chatId, id));
    await db.delete(message).where(eq(message.chatId, id));

    return await db.delete(chat).where(eq(chat.id, id));
  } catch (error) {
    console.error("Failed to delete chat by id from database");
    throw error;
  }
}

export async function getChatsByUserId({ id }: { id: string }) {
  try {
    return await db.select().from(chat).where(eq(chat.userId, id)).orderBy(desc(chat.createdAt));
  } catch (error) {
    console.error("Failed to get chats by user from database");
    throw error;
  }
}

export async function getChatById({ id }: { id: string }) {
  try {
    const [selectedChat] = await db.select().from(chat).where(eq(chat.id, id));
    return selectedChat;
  } catch (error) {
    console.error("Failed to get chat by id from database");
    throw error;
  }
}

export async function saveMessages({ messages }: { messages: Array<Message> }) {
  try {
    return await db.insert(message).values(messages);
  } catch (error) {
    console.error("Failed to save messages in database", error);
    throw error;
  }
}

export async function getMessagesByChatId({ id }: { id: string }) {
  try {
    return await db.select().from(message).where(eq(message.chatId, id)).orderBy(asc(message.createdAt));
  } catch (error) {
    console.error("Failed to get messages by chat id from database", error);
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
}) {
  try {
    const [existingVote] = await db
      .select()
      .from(vote)
      .where(and(eq(vote.messageId, messageId)));

    if (existingVote) {
      return await db
        .update(vote)
        .set({ isUpvoted: type === "up" })
        .where(and(eq(vote.messageId, messageId), eq(vote.chatId, chatId)));
    }
    return await db.insert(vote).values({
      chatId,
      messageId,
      isUpvoted: type === "up",
    });
  } catch (error) {
    console.error("Failed to upvote message in database", error);
    throw error;
  }
}

export async function getVotesByChatId({ id }: { id: string }) {
  try {
    return await db.select().from(vote).where(eq(vote.chatId, id));
  } catch (error) {
    console.error("Failed to get votes by chat id from database", error);
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
}) {
  try {
    return await db.insert(document).values({
      id,
      title,
      content,
      userId,
      createdAt: new Date(),
    });
  } catch (error) {
    console.error("Failed to save document in database");
    throw error;
  }
}

export async function getDocumentsById({ id }: { id: string }) {
  try {
    const documents = await db.select().from(document).where(eq(document.id, id)).orderBy(asc(document.createdAt));

    return documents;
  } catch (error) {
    console.error("Failed to get document by id from database");
    throw error;
  }
}

export async function getDocumentById({ id }: { id: string }) {
  try {
    const [selectedDocument] = await db
      .select()
      .from(document)
      .where(eq(document.id, id))
      .orderBy(desc(document.createdAt));

    return selectedDocument;
  } catch (error) {
    console.error("Failed to get document by id from database");
    throw error;
  }
}

export async function deleteDocumentsByIdAfterTimestamp({ id, timestamp }: { id: string; timestamp: Date }) {
  try {
    await db.delete(suggestion).where(and(eq(suggestion.documentId, id), gt(suggestion.documentCreatedAt, timestamp)));

    return await db.delete(document).where(and(eq(document.id, id), gt(document.createdAt, timestamp)));
  } catch (error) {
    console.error("Failed to delete documents by id after timestamp from database");
    throw error;
  }
}

export async function saveSuggestions({ suggestions }: { suggestions: Array<Suggestion> }) {
  try {
    return await db.insert(suggestion).values(suggestions);
  } catch (error) {
    console.error("Failed to save suggestions in database");
    throw error;
  }
}

export async function getSuggestionsByDocumentId({ documentId }: { documentId: string }) {
  try {
    return await db
      .select()
      .from(suggestion)
      .where(and(eq(suggestion.documentId, documentId)));
  } catch (error) {
    console.error("Failed to get suggestions by document version from database");
    throw error;
  }
}

export async function getMessageById({ id }: { id: string }) {
  try {
    return await db.select().from(message).where(eq(message.id, id));
  } catch (error) {
    console.error("Failed to get message by id from database");
    throw error;
  }
}

export async function deleteMessagesByChatIdAfterTimestamp({ chatId, timestamp }: { chatId: string; timestamp: Date }) {
  try {
    return await db.delete(message).where(and(eq(message.chatId, chatId), gte(message.createdAt, timestamp)));
  } catch (error) {
    console.error("Failed to delete messages by id after timestamp from database");
    throw error;
  }
}

export async function updateChatVisiblityById({
  chatId,
  visibility,
}: {
  chatId: string;
  visibility: "private" | "public";
}) {
  try {
    return await db.update(chat).set({ visibility }).where(eq(chat.id, chatId));
  } catch (error) {
    console.error("Failed to update chat visibility in database");
    throw error;
  }
}

export async function createUserMessage({
  userId,
  originalText,
}: {
  userId: string;
  originalText: string;
}): Promise<UserMessageType[]> {
  try {
    return await db.insert(userMessage).values({
      userId,
      originalText,
    }).returning();
  } catch (error) {
    console.error("Failed to create user message", error);
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
}): Promise<BragType[]> {
  try {
    return await db.insert(brag).values({
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
    console.error("Failed to create brag", error);
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
}): Promise<BragType[]> {
  try {
    return await db.select()
      .from(brag)
      .where(eq(brag.userId, userId))
      .limit(limit)
      .offset(offset)
      .orderBy(desc(brag.eventStart));
  } catch (error) {
    console.error("Failed to get brags by user", error);
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
}): Promise<BragType[]> {
  try {
    return await db.select()
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
    console.error("Failed to generate period summary", error);
    throw error;
  }
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
  db = drizzle(postgres())
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
    console.error("Failed to get companies by user", error);
    throw error;
  }
}

export async function getCompanyById({ 
  id,
  userId,
  db = drizzle(postgres())
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
    console.error("Failed to get company by id", error);
    throw error;
  }
}

export async function createCompany(input: CreateCompanyInput, db = drizzle(postgres())): Promise<Company[]> {
  try {
    return await db.insert(company)
      .values(input)
      .returning();
  } catch (error) {
    console.error("Failed to create company", error);
    throw error;
  }
}

export async function updateCompany({ 
  id,
  userId,
  data,
  db = drizzle(postgres())
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
    console.error("Failed to update company", error);
    throw error;
  }
}

export async function deleteCompany({ 
  id,
  userId,
  db = drizzle(postgres())
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
    console.error("Failed to delete company", error);
    throw error;
  }
}
