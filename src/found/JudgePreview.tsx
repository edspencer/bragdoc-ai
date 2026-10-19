// "Show me what's sent" (SPEC R21, TEST_PLAN §3.5): exactly what the judge would send for one candidate, built by the
// server (GET /api/ai/judge/preview) from the same prompt function the judge calls. Asking for it sends nothing to any
// model. Used on a Found card and on the judge's Settings card.
import { useQuery } from '@tanstack/react-query';
import { getJudgePreview, isApiError } from '../api/client.ts';
import { Btn, Dialog } from '../kit/index.ts';

const FROM: Record<'ocr' | 'quote' | 'github', string> = {
  ocr: 'the screenshot’s text, read again on this computer',
  quote: 'the quote the rules kept (the screenshot itself has moved or gone)',
  github: 'the pull request’s repo, title, description (cut at 2,000 characters) and merge date',
};

export function JudgePreviewDialog({ id, open, onClose }: { id: string | null; open: boolean; onClose: () => void }) {
  const q = useQuery({
    // under ai-instructions: saving "What counts as a win for me" changes it
    queryKey: ['ai-instructions', 'judge-preview', id],
    queryFn: ({ signal }) => getJudgePreview(id!, signal),
    enabled: open && !!id,
    retry: false,
  });
  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="What the judge is sent"
      sub="Nothing has been sent: this is what would be."
      footer={
        <Btn kind="ink" onClick={onClose}>
          Close
        </Btn>
      }
      data-testid="judge-preview"
    >
      {q.isPending ? (
        <div className="text-[13px] text-faint">Building it…</div>
      ) : q.isError ? (
        <div className="text-[13px] text-bad" role="alert">
          {isApiError(q.error) ? q.error.message : 'Couldn’t build it.'}
        </div>
      ) : (
        <div className="space-y-2">
          <p className="m-0 text-[12.5px] text-muted">
            Made from {FROM[q.data.input]}, with your name, role and aliases, your active and paused projects’ names and “What counts as a win for me”. No file names, paths or ids.
            {q.data.model ? <> It goes to <span className="font-mono font-semibold">{q.data.model}</span>.</> : null}
            {q.data.truncated ? ' Some of the screenshot’s other messages were left out to fit the model.' : ''}
          </p>
          <pre className="max-h-[55vh] overflow-auto whitespace-pre-wrap rounded-xl bg-sunk p-3 font-mono text-[11.5px] leading-relaxed" data-testid="judge-preview-text">{`${q.data.system}\n\n────────\n\n${q.data.prompt}`}</pre>
        </div>
      )}
    </Dialog>
  );
}
