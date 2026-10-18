// Keep, merge and dismiss from Found, each with an Undo toast (SPEC R7). The candidate leaves the list (and its counts)
// at once, optimistically; the refetch after it settles puts it back if the server said no. Live updates (the `found`
// event) bring every other open tab and the nav badge in step.
import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { FoundListResponse } from '../../shared/api.ts';
import type { FoundCandidate } from '../../shared/schema/index.ts';
import { dismissFound, isApiError, keepFound, mergeFound, undoFound } from '../api/client.ts';
import { useToast } from '../kit/index.ts';

export type Decision = { action: 'keep' } | { action: 'merge'; achievementId: string; title: string } | { action: 'dismiss' };

const message = (e: unknown, what: string) => (isApiError(e) ? e.message : `Couldn’t ${what}. Is BragDoc still running?`);

export function useDecide() {
  const qc = useQueryClient();
  const toast = useToast();
  const refresh = () => qc.invalidateQueries({ queryKey: ['found'] });

  const undo = useMutation({
    mutationFn: undoFound,
    onSuccess: () => toast({ msg: 'Put back in Found.' }),
    onError: (e) => toast({ msg: message(e, 'undo that'), tone: 'bad' }),
    onSettled: () => {
      void refresh();
      void qc.invalidateQueries({ queryKey: ['achievements'] });
    },
  });

  return useMutation({
    mutationFn: ({ c, d }: { c: FoundCandidate; d: Decision }) => (d.action === 'keep' ? keepFound(c.id) : d.action === 'merge' ? mergeFound(c.id, d.achievementId) : dismissFound(c.id)),
    onMutate: async ({ c }) => {
      // out of every open list at once; the counts follow from the server
      await qc.cancelQueries({ queryKey: ['found'] });
      const less = (n: number) => Math.max(0, n - 1);
      qc.setQueriesData<FoundListResponse<FoundCandidate>>({ queryKey: ['found', 'list'] }, (old) =>
        old && old.items.some((x) => x.id === c.id) ? { items: old.items.filter((x) => x.id !== c.id), counts: { ...old.counts, all: less(old.counts.all), [c.source]: less(old.counts[c.source]) } } : old,
      );
    },
    onSuccess: (r, { c, d }) => {
      const missing = !r.missingFiles?.length
        ? ''
        : c.source === 'screenshots'
          ? ' (the screenshot had been moved or deleted, so only its quote was kept)'
          : ` (${r.missingFiles.length === 1 ? 'one file had gone' : `${r.missingFiles.length} files had gone`}, so it wasn’t attached)`;
      const msg =
        d.action === 'keep'
          ? r.candidate.decision?.action === 'merge'
            ? `It was already on your board, so it was added to that one${missing}.`
            : `Kept: “${c.title}” is on your board${missing}.`
          : d.action === 'merge'
            ? `Added to “${d.title}”${missing}.`
            : 'Dismissed. It won’t come back.';
      toast({ msg, undo: () => undo.mutate(c.id) });
    },
    onError: (e, { d }) => toast({ msg: message(e, d.action === 'dismiss' ? 'dismiss that' : d.action === 'keep' ? 'keep that' : 'merge that'), tone: 'bad' }),
    onSettled: () => {
      void refresh();
      void qc.invalidateQueries({ queryKey: ['achievements'] });
    },
  });
}
