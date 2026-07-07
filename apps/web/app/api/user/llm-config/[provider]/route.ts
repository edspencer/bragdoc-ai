import { type NextRequest, NextResponse } from 'next/server';
import { z } from 'zod/v3';
import { getAuthUser } from 'lib/getAuthUser';
import { deleteLLMConfig } from '@bragdoc/database';
import { LLM_PROVIDER_DB_VALUES } from 'lib/llm/providers';

const providerSchema = z.enum(LLM_PROVIDER_DB_VALUES);

/**
 * DELETE /api/user/llm-config/[provider]
 * Delete the authenticated user's config for the given provider.
 * If the deleted config was the default, another config (if any) is
 * promoted to default.
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ provider: string }> },
) {
  try {
    const auth = await getAuthUser(req);
    if (!auth?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { provider: rawProvider } = await params;
    const parsed = providerSchema.safeParse(rawProvider);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'validation_error', message: 'Invalid provider' },
        { status: 400 },
      );
    }

    const deleted = await deleteLLMConfig(auth.user.id, parsed.data);
    if (!deleted) {
      return NextResponse.json(
        { error: 'LLM config not found' },
        { status: 404 },
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting LLM config:', error);
    return NextResponse.json(
      { error: 'Failed to delete LLM config' },
      { status: 500 },
    );
  }
}

/**
 * OPTIONS /api/user/llm-config/[provider]
 * CORS preflight handler
 */
export async function OPTIONS(_req: NextRequest) {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Methods': 'DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Allow-Origin': '*',
    },
  });
}
