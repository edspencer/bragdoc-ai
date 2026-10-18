// Example data in the web app (SPEC R10; server/example.ts): the empty board's "Fill it with example data", the strip
// that says so while it's there (it's made up, and it's one click to take away), and Settings → Data's panel.
// Removing it asks first, says exactly what goes, and leaves everything of yours alone.
import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from '@tanstack/react-router';
import { FlaskConical } from 'lucide-react';
import type { ExampleCounts } from '../../shared/api.ts';
import { addExample, isApiError, removeExample } from '../api/client.ts';
import { queryKeys, useExample } from '../api/queries.ts';
import { Btn, Panel, SectionTitle, useToast } from '../kit/index.ts';

const plural = (n: number, one: string, many = one + 's') => `${n} ${n === 1 ? one : many}`;

/** "32 achievements, 5 projects, 2 companies and 7 repos" (what's non-zero). */
export function describeCounts(c: ExampleCounts): string {
  const parts = [plural(c.achievements, 'achievement'), plural(c.projects, 'project'), plural(c.companies, 'company', 'companies'), plural(c.repos, 'repo')].filter((p) => !p.startsWith('0 '));
  return parts.length > 1 ? `${parts.slice(0, -1).join(', ')} and ${parts.at(-1)}` : (parts[0] ?? 'nothing');
}

/** Everything that shows example data refreshes (the store's events would too; this is at once). */
function useRefresh() {
  const qc = useQueryClient();
  return () => Promise.all(['example', 'achievements', 'projects', 'companies', 'repos', 'folio'].map((k) => qc.invalidateQueries({ queryKey: [k] })));
}

export function useAddExample() {
  const toast = useToast();
  const refresh = useRefresh();
  return useMutation({
    mutationFn: addExample,
    onSuccess: (r) => {
      void refresh();
      toast({ msg: r.changed.achievements ? 'Here’s a few months of Alex Marlowe’s work, all made up. Remove it any time.' : 'The example data was already here.' });
    },
    onError: (e) => toast({ msg: isApiError(e) ? `Couldn’t add the example data: ${e.message}` : 'Couldn’t add the example data: BragDoc isn’t answering.', tone: 'bad' }),
  });
}

function useRemoveExample(onDone?: () => void) {
  const toast = useToast();
  const refresh = useRefresh();
  return useMutation({
    mutationFn: removeExample,
    onSuccess: (r) => {
      void refresh();
      onDone?.();
      toast({
        msg: r.skipped?.length
          ? `Removed the example data, except ${plural(r.skipped.length, 'file')} BragDoc can’t change (see Settings → Data). Your own entries are untouched.`
          : 'Removed the example data. Your own entries are untouched.',
      });
    },
    onError: (e) => toast({ msg: isApiError(e) ? `Couldn’t remove the example data: ${e.message}` : 'Couldn’t remove the example data: BragDoc isn’t answering.', tone: 'bad' }),
  });
}

/** Remove, with a confirmation that says what goes. */
function RemoveButton({ counts, size = 'md', testId }: { counts: ExampleCounts; size?: 'sm' | 'md'; testId: string }) {
  const [asking, setAsking] = useState(false);
  const remove = useRemoveExample(() => setAsking(false));
  if (!asking)
    return (
      <Btn size={size} kind="danger" onClick={() => setAsking(true)} data-testid={testId}>
        Remove example data
      </Btn>
    );
  return (
    <span className="flex flex-wrap items-center gap-2" role="group" aria-label="Remove the example data?">
      <span className="text-[13px]">
        Remove {describeCounts(counts)}? <span className="text-muted">Your own stay.</span>
      </span>
      <Btn size="sm" kind="danger" onClick={() => remove.mutate()} disabled={remove.isPending} data-testid={`${testId}-yes`}>
        {remove.isPending ? 'Removing…' : 'Remove them'}
      </Btn>
      <Btn size="sm" kind="ghost" onClick={() => setAsking(false)}>
        Keep
      </Btn>
    </span>
  );
}

/** The strip on the board and Projects while there's example data: it's made up, and how to take it away. */
export function ExampleBanner() {
  const example = useExample();
  if (!example.data?.present) return null;
  return (
    <div className="sb-glass mt-5 flex flex-wrap items-center gap-x-3 gap-y-2 rounded-2xl px-4 py-2.5 text-[13.5px]" role="status" data-testid="example-banner">
      <FlaskConical aria-hidden className="size-4 shrink-0 text-accent" />
      <span className="min-w-0 flex-1">
        <b>Example data.</b> <span className="text-muted sm:hidden">All made up, for trying BragDoc out.</span>
        <span className="hidden text-muted sm:inline">Alex Marlowe, both companies and everything they did are made up, for trying BragDoc out. Anything you add yourself stays when it goes.</span>
      </span>
      <RemoveButton counts={example.data.counts} size="sm" testId="example-remove" />
    </div>
  );
}

/** Settings → Data: add or remove the example data. */
export function ExampleDataPanel() {
  const example = useExample();
  const add = useAddExample();
  const present = !!example.data?.present;
  return (
    <Panel tape="#e9961a">
      <div data-testid="example-data">
        <SectionTitle
          sub={
            present
              ? `There’s example data here: ${describeCounts(example.data!.counts)}, all marked “example: true” in their files. Removing it moves exactly those into backups/removed/; your own entries stay as they are.`
              : 'A few months in the working life of Alex Marlowe, a made-up engineer: projects, pull requests, quotes and screenshots, all invented. Handy for seeing what a full board looks like. One click takes it away again.'
          }
        >
          Example data
        </SectionTitle>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          {present ? (
            <RemoveButton counts={example.data!.counts} testId="example-remove-settings" />
          ) : (
            <Btn onClick={() => add.mutate()} disabled={add.isPending || !example.data} data-testid="example-add-settings">
              {add.isPending ? 'Adding…' : 'Fill the board with example data'}
            </Btn>
          )}
          {present && (
            <Link to="/" className="text-[13px] font-semibold text-accent underline decoration-dotted underline-offset-2">
              See it on the board
            </Link>
          )}
        </div>
      </div>
    </Panel>
  );
}
