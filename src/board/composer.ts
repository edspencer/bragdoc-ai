// "Drop it here.": the composer's logic (SPEC R5). Paste (⌘V) or drop images, PDFs, other files, links and GitHub PR
// URLs, or pick files, or type. Each file is uploaded as soon as it's added (POST /api/evidence), so a spoofed,
// damaged or oversized file is refused at once, with the server's own sentence; each link is previewed
// (POST /api/link-preview: a PR becomes `owner/repo#n`, with its title only if GitHub is connected; other links are
// never fetched). The first line of the text is the title, the rest the body. ⌘/Ctrl+Enter pins it.
//
// Adapted from the Scrapbook prototype's shared/composer.ts: its classification and PR regex (now shared/links.ts),
// with real uploads and previews in place of the simulated ones.
import { useCallback, useEffect, useRef, useState } from 'react';
import type { AiTidyResponse, LinkPreview } from '../../shared/api.ts';
import { isHttpUrl } from '../../shared/links.ts';
import { NETWORK_ERROR, isApiError, previewLink, uploadEvidence } from '../api/client.ts';
import { todayIso } from '../lib/dates.ts';
import { localPreview, type Pending } from './links.ts';
import { applyBody, applyTitle, withoutTidy, type TidyKey } from './tidy.ts';

export { fallbackTitle, linkEvidence, localPreview, type Pending } from './links.ts';

/** 25 MB, the server's limit (SPEC R3): checked here first, so a huge file isn't sent only to be refused. */
export const MAX_UPLOAD_BYTES = 25 * 1024 * 1024;

let pidSeq = 1;

/** "Couldn't add X: …", from an upload's failure. */
function uploadError(name: string, e: unknown): string {
  if (isApiError(e, NETWORK_ERROR)) return `Couldn't add “${name}”: BragDoc isn't answering. Is it still running?`;
  if (isApiError(e) && e.status === 413) return `“${name}” is over 25 MB, the most BragDoc keeps per file.`;
  if (isApiError(e)) return e.message;
  return `Couldn't add “${name}”.`;
}

export interface ComposerOptions {
  /** A message for the user (a refused file, a duplicate PR). */
  notify: (msg: string, tone?: 'ink' | 'bad') => void;
}

export function useComposer({ notify }: ComposerOptions) {
  const [text, setText] = useState('');
  const [pending, setPending] = useState<Pending[]>([]);
  const [projects, setProjects] = useState<string[]>([]);
  const [repos, setRepos] = useState<string[]>([]);
  const [suggestedProjects, setSuggestedProjects] = useState<string[]>([]);
  const [suggestedRepos, setSuggestedRepos] = useState<string[]>([]);
  const [impact, setImpact] = useState<number | undefined>(undefined);
  const [date, setDate] = useState(todayIso());
  // quotes read from pasted screenshots (OCR + the rules) that you chose to pin as stickies, by the picture's sha
  const [stickies, setStickies] = useState<Sticky[]>([]);
  // only ever set by an accepted Tidy suggestion (v0.2): null keeps the composer exactly as it was without AI
  const [summary, setSummary] = useState<string | null>(null);
  const [endedAt, setEndedAt] = useState<string | null>(null);
  // what Tidy put in the text (D78): the title on the first line and the body under it. A second tidy reads the text
  // without them, so it reads your words, including any you added since, and never Tidy's own as yours
  const tidyTitle = useRef<string | null>(null);
  const tidyBody = useRef<string | null>(null);
  const textRef = useRef(text);
  textRef.current = text;
  const aborts = useRef(new Map<number, AbortController>());
  const urls = useRef(new Set<string>());
  // the latest pending list, for the unmount cleanup
  const pendingRef = useRef(pending);
  pendingRef.current = pending;

  useEffect(
    () => () => {
      for (const a of aborts.current.values()) a.abort();
      for (const p of pendingRef.current) if (p.kind === 'file' && p.preview) URL.revokeObjectURL(p.preview);
    },
    [],
  );

  const update = useCallback((pid: number, patch: Partial<Pending>) => setPending((xs) => xs.map((x) => (x.pid === pid ? ({ ...x, ...patch } as Pending) : x))), []);

  const upload = useCallback(
    async (pid: number, file: File) => {
      const ctl = new AbortController();
      aborts.current.set(pid, ctl);
      update(pid, { status: 'uploading', error: undefined });
      try {
        const r = await uploadEvidence(file, ctl.signal);
        update(pid, { status: 'ready', evidence: r.evidence, file: r.file });
      } catch (e) {
        if (ctl.signal.aborted) return;
        const msg = uploadError(file.name || 'that file', e);
        // refused for what it is (spoofed, damaged, too big): it can't be retried, so it goes, with the reason
        if (isApiError(e) && e.status >= 400 && e.status < 500) {
          setPending((xs) => {
            const gone = xs.find((x) => x.pid === pid);
            if (gone?.kind === 'file' && gone.preview) URL.revokeObjectURL(gone.preview);
            return xs.filter((x) => x.pid !== pid);
          });
          notify(msg, 'bad');
        } else {
          // the server went away mid-upload: keep it, to retry
          update(pid, { status: 'error', error: msg });
          notify(msg, 'bad');
        }
      } finally {
        aborts.current.delete(pid);
      }
    },
    [update, notify],
  );

  const addFiles = useCallback(
    (files: File[]) => {
      for (const f of files) {
        const name = f.name || (f.type.startsWith('image/') ? 'Pasted picture' : 'Pasted file');
        if (f.size > MAX_UPLOAD_BYTES) {
          notify(`“${name}” is ${(f.size / 1048576).toFixed(0)} MB; BragDoc keeps files up to 25 MB.`, 'bad');
          continue;
        }
        if (f.size === 0) {
          notify(`“${name}” is empty${f.type ? '' : ' (or a folder: zip it first)'}, so there's nothing to add.`, 'bad');
          continue;
        }
        const pid = pidSeq++;
        const preview = f.type.startsWith('image/') ? URL.createObjectURL(f) : undefined;
        setPending((xs) => [...xs, { pid, kind: 'file', name, bytes: f.size, type: f.type, preview, status: 'uploading', source: f }]);
        void upload(pid, f);
      }
    },
    [upload, notify],
  );

  const retry = useCallback(
    (pid: number) => {
      const p = pendingRef.current.find((x) => x.pid === pid);
      if (p?.kind === 'file') void upload(pid, p.source);
    },
    [upload],
  );

  const addUrl = useCallback(
    async (raw: string) => {
      const url = raw.trim();
      // a ref, not state: two quick pastes of one link happen before a render
      if (urls.current.has(url)) return;
      urls.current.add(url);
      const pid = pidSeq++;
      setPending((xs) => [...xs, { pid, kind: 'link', url, status: 'loading', preview: localPreview(url) }]);
      let preview: LinkPreview;
      try {
        preview = await previewLink(url);
      } catch {
        preview = localPreview(url); // the same classification, minus suggestions: nothing is lost
      }
      update(pid, { status: 'ready', preview });
      if (preview.kind === 'github_pr') {
        if (preview.suggestedProjects.length) setSuggestedProjects((s) => [...new Set([...s, ...preview.suggestedProjects])]);
        if (preview.repoId) {
          setSuggestedRepos((s) => [...new Set([...s, preview.repoId!])]);
          // a PR names its repo outright: choose it (and its projects, if none are chosen yet)
          setRepos((r) => (r.includes(preview.repoId!) ? r : [...r, preview.repoId!]));
        }
        setProjects((p) => (p.length ? p : preview.suggestedProjects));
        if (preview.onBoard) notify(`${preview.repo}#${preview.number} is already on your board.`);
      }
    },
    [update, notify],
  );

  /** A paste: files win; else one URL becomes a link. True if it was taken (the caller prevents the default). */
  const takePaste = useCallback(
    (data: DataTransfer): boolean => {
      const files = [...data.files];
      if (files.length) {
        addFiles(files);
        return true;
      }
      const t = data.getData('text/plain').trim();
      if (isHttpUrl(t)) {
        void addUrl(t);
        return true;
      }
      return false;
    },
    [addFiles, addUrl],
  );

  /** A drop: files (folders refused), else a dragged link. */
  const takeDrop = useCallback(
    (data: DataTransfer) => {
      const items = [...data.items];
      const folders = items.filter((i) => i.kind === 'file' && i.webkitGetAsEntry?.()?.isDirectory).length;
      if (folders) notify(`${folders === 1 ? 'That is a folder' : 'Some of those are folders'}: BragDoc takes files. Zip ${folders === 1 ? 'it' : 'them'} first.`, 'bad');
      const files = [...data.files].filter((_, i) => !items[i]?.webkitGetAsEntry?.()?.isDirectory);
      if (files.length) return addFiles(files);
      if (folders) return;
      const t = (data.getData('text/uri-list').split('\n').find((l) => l && !l.startsWith('#')) || data.getData('text/plain')).trim();
      if (isHttpUrl(t)) void addUrl(t);
    },
    [addFiles, addUrl, notify],
  );

  const remove = useCallback((pid: number) => {
    aborts.current.get(pid)?.abort();
    setPending((xs) => {
      const gone = xs.find((x) => x.pid === pid);
      // its quote goes with it
      if (gone?.kind === 'file' && gone.evidence?.blob) setStickies((ss) => ss.filter((q) => q.sha !== gone.evidence!.blob));
      if (gone?.kind === 'file' && gone.preview) URL.revokeObjectURL(gone.preview);
      if (gone?.kind === 'link') urls.current.delete(gone.url);
      return xs.filter((x) => x.pid !== pid);
    });
  }, []);

  const reset = useCallback(() => {
    for (const p of pendingRef.current) if (p.kind === 'file' && p.preview) URL.revokeObjectURL(p.preview);
    urls.current.clear();
    setText('');
    setPending([]);
    setProjects([]);
    setRepos([]);
    setSuggestedProjects([]);
    setSuggestedRepos([]);
    setImpact(undefined);
    setDate(todayIso());
    setStickies([]);
    setSummary(null);
    setEndedAt(null);
    tidyTitle.current = null;
    tidyBody.current = null;
  }, []);

  /** Use some of a Tidy suggestion (D78): what you wrote stays, in the notes; nothing is pinned until you Pin it. */
  const applyTidy = useCallback((keys: TidyKey[], r: AiTidyResponse) => {
    const s = r.suggestion;
    let t = textRef.current;
    if (keys.includes('title') && s.title) {
      t = applyTitle(t, s.title, tidyTitle.current);
      tidyTitle.current = s.title;
    }
    if (keys.includes('body') && s.body) {
      t = applyBody(t, s.body);
      tidyBody.current = s.body;
    }
    if (t !== textRef.current) setText(t);
    if (keys.includes('summary') && s.summary) setSummary(s.summary);
    if (keys.includes('dates') && s.happenedAt) {
      setDate(s.happenedAt);
      setEndedAt(s.endedAt);
    }
    if (keys.includes('impact') && s.impact !== null) setImpact(s.impact);
    if (keys.includes('projects') && s.suggestedProjects.length) {
      setProjects((p) => [...new Set([...p, ...s.suggestedProjects])]);
      setSuggestedProjects((p) => [...new Set([...p, ...s.suggestedProjects])]);
    }
  }, []);

  const addSticky = useCallback((q: Sticky) => setStickies((xs) => (xs.some((x) => x.sha === q.sha) ? xs : [...xs, q])), []);
  const removeSticky = useCallback((sha: string) => setStickies((xs) => xs.filter((x) => x.sha !== sha)), []);

  const busy = pending.some((p) => p.status === 'uploading' || p.status === 'loading');
  const failed = pending.some((p) => p.status === 'error');
  const empty = !text.trim() && !pending.length;

  /** The "Paste a screenshot" / "Paste a PR link" buttons: read the clipboard, where the browser allows it. */
  const pasteFromClipboard = useCallback(
    async (want: 'image' | 'link') => {
      const keys = pasteKeys();
      try {
        if (want === 'image' && navigator.clipboard?.read) {
          const items = await navigator.clipboard.read();
          const files: File[] = [];
          for (const item of items) {
            const type = item.types.find((t) => t.startsWith('image/'));
            if (type) files.push(new File([await item.getType(type)], `Pasted picture.${type.split('/')[1] === 'jpeg' ? 'jpg' : type.split('/')[1]}`, { type }));
          }
          if (files.length) return addFiles(files);
        }
        const t = navigator.clipboard?.readText ? (await navigator.clipboard.readText()).trim() : '';
        if (isHttpUrl(t)) return void addUrl(t);
        notify(want === 'image' ? `There's no picture on your clipboard. Copy a screenshot, then press ${keys} here.` : `There's no link on your clipboard. Copy a PR link, then press ${keys} here.`);
      } catch {
        // the browser said no (or can't): the keyboard always works
        notify(`Press ${keys} to paste it here.`);
      }
    },
    [addFiles, addUrl, notify],
  );

  return {
    pasteFromClipboard,
    text,
    setText,
    pending,
    projects,
    setProjects,
    repos,
    setRepos,
    suggestedProjects,
    suggestedRepos,
    impact,
    setImpact,
    date,
    setDate,
    stickies,
    summary,
    setSummary,
    endedAt,
    setEndedAt,
    applyTidy,
    /** What a tidy reads: the text without what Tidy put there. */
    tidySource: () => withoutTidy(textRef.current, tidyTitle.current, tidyBody.current),
    addSticky,
    removeSticky,
    addFiles,
    addUrl,
    takePaste,
    takeDrop,
    remove,
    retry,
    reset,
    busy,
    failed,
    empty,
    /** Pin it: nothing to pin, an upload still going, or one that failed (retry or remove it first) all say no. */
    canSubmit: !empty && !busy && !failed,
  };
}

export type Composer = ReturnType<typeof useComposer>;

/** The paste shortcut on this computer, as the board's hints spell it: ⌘V on a Mac, Ctrl+V elsewhere. */
export const pasteKeys = (): string => (typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform) ? '⌘V' : 'Ctrl+V');

/** A quote read from a pasted picture, to pin as a sticky (quote evidence) with it. */
export interface Sticky {
  /** The picture it was read from. */
  sha: string;
  text: string;
  from?: string;
  where?: string;
}
