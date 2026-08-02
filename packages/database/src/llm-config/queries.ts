import { and, desc, eq, ne } from 'drizzle-orm';
import { db as defaultDb } from '../index';
import {
  type LLMProviderDbValue,
  type UserLLMConfig,
  userLLMConfig,
} from '../schema';

/**
 * Input for upsertLLMConfig. Encryption happens in the web app before this
 * layer — plaintext API keys must never reach the database package.
 */
export interface UpsertLLMConfigInput {
  userId: string;
  provider: LLMProviderDbValue;
  encryptedApiKey?: string | null;
  iv?: string | null;
  keyHint?: string | null;
  model: string;
  baseURL?: string | null;
  isDefault?: boolean;
  lastVerifiedAt?: Date | null;
}

/**
 * Get all LLM provider configs for a user
 */
export async function getLLMConfigsForUser(
  userId: string,
  dbInstance = defaultDb,
): Promise<UserLLMConfig[]> {
  try {
    return await dbInstance
      .select()
      .from(userLLMConfig)
      .where(eq(userLLMConfig.userId, userId))
      .orderBy(desc(userLLMConfig.createdAt));
  } catch (error) {
    console.error('Error in getLLMConfigsForUser:', error);
    throw error;
  }
}

/**
 * Get the user's default LLM provider config (at most one exists,
 * enforced by a partial unique index)
 */
export async function getDefaultLLMConfig(
  userId: string,
  dbInstance = defaultDb,
): Promise<UserLLMConfig | null> {
  try {
    const configs = await dbInstance
      .select()
      .from(userLLMConfig)
      .where(
        and(
          eq(userLLMConfig.userId, userId),
          eq(userLLMConfig.isDefault, true),
        ),
      )
      .limit(1);

    return configs[0] || null;
  } catch (error) {
    console.error('Error in getDefaultLLMConfig:', error);
    throw error;
  }
}

/**
 * Insert or update the config for (userId, provider).
 *
 * When `isDefault` is true, clears `isDefault` on the user's other rows
 * first so the partial unique index is never violated. (Sequential queries
 * rather than a transaction — the neon-http driver does not support
 * transactions; a failure between the two statements can at worst leave the
 * user with no default, which callers treat the same as "no config".)
 */
export async function upsertLLMConfig(
  data: UpsertLLMConfigInput,
  dbInstance = defaultDb,
): Promise<UserLLMConfig> {
  try {
    if (data.isDefault) {
      await dbInstance
        .update(userLLMConfig)
        .set({ isDefault: false, updatedAt: new Date() })
        .where(
          and(
            eq(userLLMConfig.userId, data.userId),
            ne(userLLMConfig.provider, data.provider),
            eq(userLLMConfig.isDefault, true),
          ),
        );
    }

    const values = {
      userId: data.userId,
      provider: data.provider,
      encryptedApiKey: data.encryptedApiKey ?? null,
      iv: data.iv ?? null,
      keyHint: data.keyHint ?? null,
      model: data.model,
      baseURL: data.baseURL ?? null,
      isDefault: data.isDefault ?? false,
      lastVerifiedAt: data.lastVerifiedAt ?? null,
    };

    const [row] = await dbInstance
      .insert(userLLMConfig)
      .values(values)
      .onConflictDoUpdate({
        target: [userLLMConfig.userId, userLLMConfig.provider],
        set: {
          encryptedApiKey: values.encryptedApiKey,
          iv: values.iv,
          keyHint: values.keyHint,
          model: values.model,
          baseURL: values.baseURL,
          isDefault: values.isDefault,
          lastVerifiedAt: values.lastVerifiedAt,
          updatedAt: new Date(),
        },
      })
      .returning();

    if (!row) {
      throw new Error('Failed to upsert LLM config');
    }

    return row;
  } catch (error) {
    console.error('Error in upsertLLMConfig:', error);
    throw error;
  }
}

/**
 * Delete the config for (userId, provider).
 *
 * If the deleted row was the user's default, promotes the most recently
 * created remaining config (if any) to default.
 *
 * @returns the deleted row, or null if no row existed
 */
export async function deleteLLMConfig(
  userId: string,
  provider: LLMProviderDbValue,
  dbInstance = defaultDb,
): Promise<UserLLMConfig | null> {
  try {
    const [deleted] = await dbInstance
      .delete(userLLMConfig)
      .where(
        and(
          eq(userLLMConfig.userId, userId),
          eq(userLLMConfig.provider, provider),
        ),
      )
      .returning();

    if (!deleted) {
      return null;
    }

    if (deleted.isDefault) {
      const remaining = await dbInstance
        .select()
        .from(userLLMConfig)
        .where(eq(userLLMConfig.userId, userId))
        .orderBy(desc(userLLMConfig.createdAt))
        .limit(1);

      const next = remaining[0];
      if (next) {
        await dbInstance
          .update(userLLMConfig)
          .set({ isDefault: true, updatedAt: new Date() })
          .where(eq(userLLMConfig.id, next.id));
      }
    }

    return deleted;
  } catch (error) {
    console.error('Error in deleteLLMConfig:', error);
    throw error;
  }
}
