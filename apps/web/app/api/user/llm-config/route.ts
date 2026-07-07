import { type NextRequest, NextResponse } from 'next/server';
import { z } from 'zod/v3';
import { getAuthUser } from 'lib/getAuthUser';
import {
  getLLMConfigsForUser,
  upsertLLMConfig,
  type UserLLMConfig,
} from '@bragdoc/database';
import { DEFAULT_MODELS, verifyLLMConfig } from '@bragdoc/ai';
import { decryptApiKey, encryptApiKey } from 'lib/crypto/llm-keys';
import {
  BASE_URL_REQUIRED_PROVIDERS,
  buildLLMConfig,
  dbProviderToLLMProvider,
  KEYLESS_PROVIDERS,
  LLM_PROVIDER_DB_VALUES,
} from 'lib/llm/providers';
import { validateBaseURL } from 'lib/llm/validate-base-url';

// Validation schema for upserting a provider config
const llmConfigSchema = z.object({
  provider: z.enum(LLM_PROVIDER_DB_VALUES),
  apiKey: z.string().min(1).max(1024).optional(),
  model: z.string().min(1).max(256).optional(),
  baseURL: z.string().url().max(512).optional(),
  setDefault: z.boolean().optional(),
});

/**
 * Strip secret material from a config row before returning it.
 * NEVER include encryptedApiKey or iv in any response.
 */
function maskConfig(row: UserLLMConfig) {
  return {
    id: row.id,
    provider: row.provider,
    model: row.model,
    baseURL: row.baseURL,
    keyHint: row.keyHint,
    isDefault: row.isDefault,
    lastVerifiedAt: row.lastVerifiedAt,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

/**
 * GET /api/user/llm-config
 * List the authenticated user's LLM provider configs (masked)
 */
export async function GET(req: NextRequest) {
  try {
    const auth = await getAuthUser(req);
    if (!auth?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const configs = await getLLMConfigsForUser(auth.user.id);

    return NextResponse.json({ configs: configs.map(maskConfig) });
  } catch (error) {
    console.error('Error fetching LLM configs:', error);
    return NextResponse.json(
      { error: 'Failed to fetch LLM configs' },
      { status: 500 },
    );
  }
}

/**
 * PUT /api/user/llm-config
 * Upsert the config for one provider. Verifies the key/endpoint against the
 * provider (via a tiny generateText probe) before storing; the API key is
 * AES-256-GCM encrypted at rest and never echoed back.
 */
export async function PUT(req: NextRequest) {
  try {
    const auth = await getAuthUser(req);
    if (!auth?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const userId = auth.user.id;

    const body = await req.json();
    const data = llmConfigSchema.parse(body);
    const { provider } = data;

    const existingConfigs = await getLLMConfigsForUser(userId);
    const existing =
      existingConfigs.find((config) => config.provider === provider) ?? null;

    // Resolve the raw API key: the one supplied in this request, or (when
    // the user is editing model/baseURL only) the stored, decrypted key.
    let rawApiKey = data.apiKey;
    if (!rawApiKey && existing?.encryptedApiKey && existing.iv) {
      rawApiKey = await decryptApiKey(existing.encryptedApiKey, existing.iv);
    }

    if (!rawApiKey && !KEYLESS_PROVIDERS.includes(provider)) {
      return NextResponse.json(
        {
          error: 'validation_error',
          message: `An API key is required for the ${provider} provider`,
        },
        { status: 400 },
      );
    }

    const model =
      data.model ||
      existing?.model ||
      DEFAULT_MODELS[dbProviderToLLMProvider(provider)];
    const baseURL = data.baseURL || existing?.baseURL || undefined;

    if (!baseURL && BASE_URL_REQUIRED_PROVIDERS.includes(provider)) {
      return NextResponse.json(
        {
          error: 'validation_error',
          message: `A base URL is required for the ${provider} provider`,
        },
        { status: 400 },
      );
    }

    // SSRF guard: the base URL (whether supplied in this request or reused
    // from the existing row) is probed server-side below, so reject
    // private/internal targets unless BYOK_ALLOW_PRIVATE_BASEURLS is set
    // (self-hosted deployments).
    if (baseURL) {
      const baseURLValidation = validateBaseURL(baseURL);
      if (!baseURLValidation.ok) {
        return NextResponse.json(
          { error: 'invalid_base_url', message: baseURLValidation.reason },
          { status: 400 },
        );
      }
    }

    // Verify the config actually works before storing it
    const llmConfig = buildLLMConfig({
      provider,
      apiKey: rawApiKey,
      model,
      baseURL,
    });
    const verification = await verifyLLMConfig(llmConfig);

    if (!verification.ok) {
      // Truncate the upstream error echo so responses from the probed
      // endpoint can't be read back wholesale via this route.
      return NextResponse.json(
        {
          error: 'verification_failed',
          message: verification.error.slice(0, 300),
        },
        { status: 422 },
      );
    }

    const encrypted = rawApiKey ? await encryptApiKey(rawApiKey) : null;
    const isFirstConfig = existingConfigs.length === 0;
    const isDefault =
      isFirstConfig ||
      data.setDefault === true ||
      (existing?.isDefault ?? false);

    const row = await upsertLLMConfig({
      userId,
      provider,
      encryptedApiKey: encrypted?.encrypted ?? null,
      iv: encrypted?.iv ?? null,
      keyHint: rawApiKey ? rawApiKey.slice(-4) : null,
      model,
      baseURL: baseURL ?? null,
      isDefault,
      lastVerifiedAt: new Date(),
    });

    return NextResponse.json(
      { config: maskConfig(row) },
      { status: existing ? 200 : 201 },
    );
  } catch (error) {
    console.error('Error saving LLM config:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 },
      );
    }

    return NextResponse.json(
      { error: 'Failed to save LLM config' },
      { status: 500 },
    );
  }
}

/**
 * OPTIONS /api/user/llm-config
 * CORS preflight handler
 */
export async function OPTIONS(_req: NextRequest) {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Methods': 'GET, PUT, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Allow-Origin': '*',
    },
  });
}
