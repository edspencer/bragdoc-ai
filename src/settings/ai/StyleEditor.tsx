// "How I write" (SPEC R20, R23, R24): the editor for ai/style.md, which Tidy and Draft both include in their prompts.
// Shared: PR26 built it, PR27 mounts the same component on its card. It's your file (D67): saving sends nothing to any
// model, works with AI off, and a hand edit shows up here live. A save sends the ETag you loaded, so an edit made
// meanwhile (by hand, or in another tab) is a 409 with "load theirs", never a silent overwrite; a broken file is shown
// with its Problems and replaced only with its ETag.
import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { isApiError, putAiInstructions } from '../../api/client.ts';
import { queryKeys, useAiInstructions } from '../../api/queries.ts';
import { Btn, TextArea, useToast } from '../../kit/index.ts';

const PLACEHOLDER = 'For example:\n- Short titles, no more than eight words.\n- British spelling.\n- Lead with what changed for people, then how.\n- Never call anything "seamless".';

export function StyleEditor({ testId = 'style-editor' }: { testId?: string }) {
  const q = useAiInstructions('style');
  const qc = useQueryClient();
  const toast = useToast();
  const [text, setText] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [conflict, setConflict] = useState(false);
  const file = q.data;
  const onDisk = file?.text ?? '';
  // null follows the file (a hand edit shows up live); once you type, a change on disk doesn't clobber your words
  const value = text ?? onDisk;
  const dirty = text !== null && text !== onDisk;

  const save = async () => {
    setSaving(true);
    try {
      const r = await putAiInstructions('style', value, file?.etag ?? null);
      qc.setQueryData(queryKeys.aiInstructions('style'), r);
      setText(null);
      setConflict(false);
      toast({ msg: 'Saved to ai/style.md.' });
    } catch (e) {
      if (isApiError(e, 'conflict')) setConflict(true);
      else toast({ msg: isApiError(e) ? e.message : 'That didn’t save.', tone: 'bad' });
    } finally {
      setSaving(false);
    }
  };

  if (q.isPending) return <div className="text-[12.5px] text-faint">Reading ai/style.md…</div>;
  if (q.isError || !file) return <div className="text-[12.5px] text-bad">Couldn’t read ai/style.md.</div>;
  const over = value.length > file.maxChars;
  return (
    <div className="space-y-2" data-testid={testId}>
      <TextArea value={value} onChange={(e) => setText(e.target.value)} rows={5} placeholder={PLACEHOLDER} readOnly={file.readOnly} aria-label="How I write" className="font-mono text-[12.5px]" data-testid={`${testId}-text`} />
      {file.problems.length > 0 && (
        <p className="m-0 text-[12px] text-warn" role="status">
          ai/style.md has a problem: {file.problems[0]!.message}. {file.body ? 'Tidy uses the last good copy until it’s fixed.' : 'Tidy leaves it out until it’s fixed.'}
        </p>
      )}
      {conflict && (
        <p className="m-0 text-[12px]" role="alert" data-testid={`${testId}-conflict`}>
          <b>It changed meanwhile</b> (by hand, or in another tab).{' '}
          <button type="button" className="font-semibold underline decoration-dotted underline-offset-2" onClick={() => (setText(null), setConflict(false), void q.refetch())}>
            Load that version
          </button>{' '}
          (yours is lost), or copy yours first.
        </p>
      )}
      <div className="flex flex-wrap items-center gap-2">
        <Btn size="sm" kind="ink" onClick={() => void save()} disabled={!dirty || saving || over || file.readOnly} data-testid={`${testId}-save`}>
          {saving ? 'Saving…' : 'Save'}
        </Btn>
        {dirty && (
          <Btn size="sm" kind="ghost" onClick={() => setText(null)}>
            Undo changes
          </Btn>
        )}
        <span className={`ml-auto text-[11.5px] ${over ? 'text-bad' : 'text-faint'}`}>
          {file.exists ? 'ai/style.md' : 'Not written yet: optional'} · {value.length.toLocaleString('en-US')} / {file.maxChars.toLocaleString('en-US')}
        </span>
      </div>
    </div>
  );
}
