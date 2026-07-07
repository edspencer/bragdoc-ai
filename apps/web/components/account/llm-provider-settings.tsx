'use client';

import { useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod/v3';
import { formatDistanceToNow } from 'date-fns';

import { DEFAULT_MODELS, PROVIDER_OPTIONS } from '@bragdoc/ai';
import type { LLMProviderDbValue } from '@/database/schema';
import {
  BASE_URL_REQUIRED_PROVIDERS,
  dbProviderToLLMProvider,
  KEYLESS_PROVIDERS,
  LLM_PROVIDER_DB_VALUES,
  llmProviderToDbProvider,
  PROVIDER_DISPLAY_NAMES,
} from 'lib/llm/providers';
import { useLLMConfigs, type LLMConfigSummary } from 'hooks/use-llm-config';
import { useToast } from '@/hooks/use-toast';

import { Alert, AlertDescription } from 'components/ui/alert';
import { Badge } from 'components/ui/badge';
import { Button } from 'components/ui/button';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from 'components/ui/form';
import { Input } from 'components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from 'components/ui/select';

const formSchema = z.object({
  provider: z.enum(LLM_PROVIDER_DB_VALUES),
  apiKey: z.string().optional(),
  model: z.string().min(1, 'Model is required').max(256),
  baseURL: z
    .string()
    .url('Must be a valid URL')
    .max(512)
    .optional()
    .or(z.literal('')),
});

type LLMConfigFormData = z.infer<typeof formSchema>;

function signupUrlFor(provider: LLMProviderDbValue): string | null {
  const option = PROVIDER_OPTIONS.find(
    (opt) => llmProviderToDbProvider(opt.value) === provider,
  );
  const match = option?.description.match(/https?:\/\/\S+/);
  return match ? match[0] : null;
}

function defaultModelFor(provider: LLMProviderDbValue): string {
  return DEFAULT_MODELS[dbProviderToLLMProvider(provider)];
}

export function LLMProviderSettings() {
  const { configs, isLoading, mutate } = useLLMConfigs();
  const { toast } = useToast();
  const [isSaving, setIsSaving] = useState(false);
  const [verifyError, setVerifyError] = useState<string | null>(null);

  const form = useForm<LLMConfigFormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      provider: 'openai',
      apiKey: '',
      model: defaultModelFor('openai'),
      baseURL: '',
    },
  });

  const selectedProvider = form.watch('provider');
  const existingConfig = configs?.find(
    (config) => config.provider === selectedProvider,
  );
  const needsBaseURL = BASE_URL_REQUIRED_PROVIDERS.includes(selectedProvider);
  const isKeyless = KEYLESS_PROVIDERS.includes(selectedProvider);
  const signupUrl = signupUrlFor(selectedProvider);

  const handleProviderChange = (value: string) => {
    const provider = value as LLMProviderDbValue;
    const existing = configs?.find((config) => config.provider === provider);
    form.setValue('provider', provider);
    form.setValue('model', existing?.model || defaultModelFor(provider));
    form.setValue('baseURL', existing?.baseURL || '');
    form.setValue('apiKey', '');
    setVerifyError(null);
  };

  const saveConfig = async (body: Record<string, unknown>) => {
    const res = await fetch('/api/user/llm-config', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => null);
      throw new Error(data?.message || 'Failed to save provider config');
    }

    await mutate();
  };

  const handleSubmit = async (data: LLMConfigFormData) => {
    setVerifyError(null);

    // Client-side guard: a key is required unless the provider is keyless or
    // the user already has a stored key for it
    if (!data.apiKey && !isKeyless && !existingConfig?.keyHint) {
      setVerifyError('An API key is required for this provider.');
      return;
    }

    setIsSaving(true);
    try {
      await saveConfig({
        provider: data.provider,
        apiKey: data.apiKey || undefined,
        model: data.model,
        baseURL: data.baseURL || undefined,
      });

      toast({
        title: 'Provider verified and saved',
        description: `${PROVIDER_DISPLAY_NAMES[data.provider]} is ready to use.`,
      });
      form.setValue('apiKey', '');
    } catch (error) {
      setVerifyError(
        error instanceof Error
          ? error.message
          : 'Failed to save provider config',
      );
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">AI Provider</h2>
        <p className="text-muted-foreground text-sm">
          BragDoc uses your own LLM API key to power AI features. Your key is
          encrypted at rest and only ever used to call your chosen provider.
        </p>
      </div>

      <Form {...form}>
        <form
          onSubmit={form.handleSubmit(handleSubmit)}
          className="max-w-xl space-y-4"
        >
          <FormField
            control={form.control}
            name="provider"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Provider</FormLabel>
                <Select
                  onValueChange={handleProviderChange}
                  value={field.value}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a provider" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {PROVIDER_OPTIONS.map((option) => {
                      const dbValue = llmProviderToDbProvider(option.value);
                      return (
                        <SelectItem key={dbValue} value={dbValue}>
                          {option.name}
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
                {signupUrl && (
                  <FormDescription>
                    <a
                      href={signupUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="underline underline-offset-2"
                    >
                      Get an API key
                    </a>
                  </FormDescription>
                )}
                <FormMessage />
              </FormItem>
            )}
          />

          {!isKeyless && (
            <FormField
              control={form.control}
              name="apiKey"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>API Key</FormLabel>
                  <FormControl>
                    <Input
                      type="password"
                      autoComplete="off"
                      data-1p-ignore
                      placeholder={
                        existingConfig?.keyHint
                          ? `••••${existingConfig.keyHint}`
                          : 'Paste your API key'
                      }
                      {...field}
                    />
                  </FormControl>
                  {existingConfig?.keyHint && (
                    <FormDescription>
                      Leave blank to keep your existing key.
                    </FormDescription>
                  )}
                  <FormMessage />
                </FormItem>
              )}
            />
          )}

          <FormField
            control={form.control}
            name="model"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Model</FormLabel>
                <FormControl>
                  <Input
                    placeholder={defaultModelFor(selectedProvider)}
                    autoComplete="off"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {needsBaseURL && (
            <FormField
              control={form.control}
              name="baseURL"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Base URL</FormLabel>
                  <FormControl>
                    <Input
                      placeholder={
                        selectedProvider === 'ollama'
                          ? 'http://localhost:11434/api'
                          : 'https://your-endpoint.example.com/v1'
                      }
                      autoComplete="off"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}

          {verifyError && (
            <Alert variant="destructive">
              <AlertDescription>{verifyError}</AlertDescription>
            </Alert>
          )}

          <Button type="submit" disabled={isSaving}>
            {isSaving ? 'Verifying...' : 'Verify & Save'}
          </Button>
        </form>
      </Form>

      {!isLoading && configs && configs.length > 0 && (
        <ConfiguredProviderList configs={configs} onChanged={() => mutate()} />
      )}
    </div>
  );
}

interface ConfiguredProviderListProps {
  configs: LLMConfigSummary[];
  onChanged: () => void;
}

function ConfiguredProviderList({
  configs,
  onChanged,
}: ConfiguredProviderListProps) {
  const { toast } = useToast();
  const [busyProvider, setBusyProvider] = useState<string | null>(null);

  const setDefault = async (config: LLMConfigSummary) => {
    setBusyProvider(config.provider);
    try {
      const res = await fetch('/api/user/llm-config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider: config.provider, setDefault: true }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.message || 'Failed to set default provider');
      }
      onChanged();
      toast({
        title: 'Default provider updated',
        description: `${PROVIDER_DISPLAY_NAMES[config.provider]} is now your default provider.`,
      });
    } catch (error) {
      toast({
        title: 'Failed to set default provider',
        description: error instanceof Error ? error.message : undefined,
        variant: 'destructive',
      });
    } finally {
      setBusyProvider(null);
    }
  };

  const deleteConfig = async (config: LLMConfigSummary) => {
    setBusyProvider(config.provider);
    try {
      const res = await fetch(`/api/user/llm-config/${config.provider}`, {
        method: 'DELETE',
      });
      if (!res.ok) {
        throw new Error('Failed to remove provider');
      }
      onChanged();
      toast({
        title: 'Provider removed',
        description: `${PROVIDER_DISPLAY_NAMES[config.provider]} has been removed.`,
      });
    } catch (error) {
      toast({
        title: 'Failed to remove provider',
        description: error instanceof Error ? error.message : undefined,
        variant: 'destructive',
      });
    } finally {
      setBusyProvider(null);
    }
  };

  return (
    <div className="space-y-3">
      <h3 className="font-medium text-sm">Configured providers</h3>
      <div className="divide-y rounded-lg border">
        {configs.map((config) => (
          <div
            key={config.id}
            className="flex flex-wrap items-center justify-between gap-3 p-4"
          >
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="font-medium">
                  {PROVIDER_DISPLAY_NAMES[config.provider]}
                </span>
                {config.isDefault && <Badge variant="secondary">Default</Badge>}
              </div>
              <div className="text-muted-foreground text-sm">
                {config.model}
                {config.keyHint && <> · key ••••{config.keyHint}</>}
                {config.lastVerifiedAt && (
                  <>
                    {' '}
                    · verified{' '}
                    {formatDistanceToNow(new Date(config.lastVerifiedAt), {
                      addSuffix: true,
                    })}
                  </>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              {!config.isDefault && (
                <Button
                  variant="outline"
                  size="sm"
                  disabled={busyProvider === config.provider}
                  onClick={() => setDefault(config)}
                >
                  Set default
                </Button>
              )}
              <Button
                variant="outline"
                size="sm"
                disabled={busyProvider === config.provider}
                onClick={() => deleteConfig(config)}
              >
                Delete
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
