'use client';

import Link from 'next/link';
import { Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

/** Error code returned by AI routes when no LLM provider is configured. */
export const NO_LLM_CONFIGURED_ERROR = 'no_llm_configured';

/**
 * Returns true when an API response body / error message indicates the
 * user has no LLM provider configured (HTTP 409 `no_llm_configured`).
 */
export function isNoLLMConfiguredError(error: unknown): boolean {
  if (typeof error === 'string') {
    return error.includes(NO_LLM_CONFIGURED_ERROR);
  }
  if (error && typeof error === 'object') {
    const maybe = error as { error?: unknown; message?: unknown };
    if (typeof maybe.error === 'string') {
      return maybe.error.includes(NO_LLM_CONFIGURED_ERROR);
    }
    if (typeof maybe.message === 'string') {
      return maybe.message.includes(NO_LLM_CONFIGURED_ERROR);
    }
  }
  return false;
}

/**
 * Toast variant of the CTA, for surfaces without a natural inline spot
 * (e.g. chat streams, workstream generation). Uses sonner.
 */
export function showNoLLMConfigToast() {
  toast.error('Connect your AI provider', {
    description:
      'BragDoc uses your own LLM API key for AI features. Add one in your account settings.',
    action: {
      label: 'Add API key',
      onClick: () => {
        window.location.href = '/account';
      },
    },
  });
}

interface NoLLMConfigAlertProps {
  className?: string;
}

/**
 * Inline CTA shown wherever an AI feature fails with `no_llm_configured`.
 * BragDoc runs all AI features on your own LLM API key; this points the
 * user at Settings to add one.
 */
export function NoLLMConfigAlert({ className }: NoLLMConfigAlertProps) {
  return (
    <Alert className={cn('text-left', className)}>
      <Sparkles />
      <AlertTitle>Connect your AI provider</AlertTitle>
      <AlertDescription>
        <p>
          BragDoc uses your own LLM API key for AI features like chat, document
          generation, and summaries. Add a key from OpenAI, Anthropic, Google,
          and more in your account settings — it takes about a minute.
        </p>
        <Button asChild size="sm" className="mt-2">
          <Link href="/account">Add your API key</Link>
        </Button>
      </AlertDescription>
    </Alert>
  );
}
