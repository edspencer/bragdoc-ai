import { type NextRequest, NextResponse } from 'next/server';
import { z } from 'zod/v3';
import { getAuthUser } from 'lib/getAuthUser';
import {
  getLLMConfigsForUser,
  upsertLLMConfig,
  type UserLLMConfig,
} from '@bragdoc/database';
import {
  DEFAULT_MODELS,
  verifyLLMConfig,
  type VerifyLLMFailureCode,
} from '@bragdoc/ai';
import { decryptApiKey, encryptApiKey } from 'lib/crypto/llm-keys';
import {
  BASE_URL_REQUIRED_PROVIDERS,
  buildLLMConfig,
  dbProviderToLLMProvider,
  KEYLESS_PROVIDERS,
  LLM_PROVIDER_DB_VALUES,
} from 'lib/llm/providers';
import { createSSRFSafeFetch } from 'lib/llm/safe-fetch';
import { validateBaseURL } from 'lib/llm/validate-base-url';

/**
 * The verification probe allows itself 15s; Vercel's default function limit
 * is 10s, which would 504 a slow-but-valid provider before we could store the
 * config. Matches the other AI-calling routes.
 */
export const maxDuration = 60;

// Validation schema for upserting a provider config
const llmConfigSchema = z.object({
  provider: z.enum(LLM_PROVIDER_DB_VALUES),
  apiKey: z.string().min(1).max(1024).optional(),
  model: z.string().min(1).max(256).optional(),
  baseURL: z.string().url().max(512).optional(),
  setDefault: z.boolean().optional(),
});

/**
 * Fixed, non-reflective messages for each verification failure class.
 *
 * The probe's raw error embeds the upstream response body (a non-JSON
 * response becomes a JSONParseError whose message quotes the text), so
 * echoing it would let a user read back whatever the probed endpoint
 * returned. The raw error is logged server-side instead.
 */
const VERIFICATION_MESSAGES: Record<VerifyLLMFailureCode, string> = {
  unauthorized:
    'The provider rejected that API key. Check the key and try again.',
  forbidden:
    'The provider refused the request for that key — it may not have access ' +
    'to the requested model.',
  not_found:
    'The provider could not find that model or endpoint. Check the model ' +
    'name (and base URL, if you set one).',
  rate_limited:
    'The provider rate-limited the verification request. Wait a moment and ' +
    'try again.',
  invalid_request:
    'The provider rejected the verification request. Check the model name ' +
    '(and base URL, if you set one).',
  provider_error:
    'The provider returned a server error. Try again in a few minutes.',
  unreachable:
    'Could not connect to the provider endpoint. Check the base URL and ' +
    'that the endpoint is reachable from the internet.',
  blocked_redirect:
    'The endpoint redirected to a private or internal address, which is not ' +
    'allowed.',
  timeout:
    'Verification timed out. Check that the provider endpoint is reachable.',
  unknown: 'Could not verify the provider with those settings.',
};

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
 *
 * A request that only asks to promote an already-stored provider to default
 * (`{ provider, setDefault: true }`, no credential/endpoint change) skips the
 * probe entirely — it is a local flag flip, and running a live probe would
 * make the default unchangeable during a provider outage.
 */
export async function PUT(req: NextRequest) {
  try {
    const auth = await getAuthUser(req);
    if (!auth?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const userId = auth.user.id;

    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json(
        { error: 'validation_error', message: 'Request body must be JSON' },
        { status: 400 },
      );
    }

    const data = llmConfigSchema.parse(body);
    const { provider } = data;

    const existingConfigs = await getLLMConfigsForUser(userId);
    const existing =
      existingConfigs.find((config) => config.provider === provider) ?? null;

    // Set-default-only: nothing about the credentials or endpoint changes, so
    // there is nothing to verify.
    const isSetDefaultOnly =
      data.setDefault === true && !data.apiKey && !data.model && !data.baseURL;

    if (isSetDefaultOnly && existing) {
      const row = await upsertLLMConfig({
        userId,
        provider,
        encryptedApiKey: existing.encryptedApiKey,
        iv: existing.iv,
        keyHint: existing.keyHint,
        model: existing.model,
        baseURL: existing.baseURL,
        isDefault: true,
        lastVerifiedAt: existing.lastVerifiedAt,
      });

      return NextResponse.json({ config: maskConfig(row) }, { status: 200 });
    }

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
    const verification = await verifyLLMConfig(llmConfig, {
      // Redirects are re-validated per hop rather than followed blindly, so a
      // public base URL cannot bounce the probe onto an internal address.
      fetch: createSSRFSafeFetch(),
    });

    if (!verification.ok) {
      // Never echo the provider's own error text: it can embed the probed
      // endpoint's response body. Log it, return a fixed classified message.
      console.warn(
        `LLM config verification failed for ${provider} (${verification.code}):`,
        verification.error,
      );

      return NextResponse.json(
        {
          error: 'verification_failed',
          code: verification.code,
          message:
            VERIFICATION_MESSAGES[verification.code] ??
            VERIFICATION_MESSAGES.unknown,
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
