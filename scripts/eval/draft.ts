// `npm run eval:draft` (PR27, SPEC R24): Folio's Draft with AI on a real model. Three synthetic folios from the example
// data (fixtures/example, as of 2026-10-18): last quarter, the last six months, and a year on a 4k context, which is
// too small for all of it, so the budget leaves the lowest-impact items out. Each goes through the same prepareDraft()
// and prompt as the route, then the same check the page shows: citation coverage, ungrounded facts, filler, and
// citations to clippings that weren't sent. A draft passes with every bullet cited and nothing flagged.
//
// BRAGDOC_LIVE_AI=1 npm run eval:draft -- --connection ollama@http://127.0.0.1:11434 --model gemma4:e4b [--record]
// One call per folio, each a few minutes on a CPU. `--show` prints each draft in full, for the PR body.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import type { AiDraftCheck } from '../../shared/api.ts';
import { checkDraft, citations, flagCount } from '../../shared/ai/draft.ts';
import type { FolioFilter } from '../../shared/folio.ts';
import { prepareDraft, type PreparedDraft } from '../../server/ai/draft/prepare.ts';
import { addExample } from '../../server/example.ts';
import { folioData } from '../../server/folio.ts';
import { createServices } from '../../server/services/index.ts';
import { Store } from '../../server/store/index.ts';
import { isMain, main, type EvalSpec } from './lib.ts';

const AS_OF = '2026-10-18';

interface Input {
  label: string;
  from: string;
  to: string;
  contextTokens: number;
  purpose: string;
}

interface Answer {
  draft: string;
  prepared: PreparedDraft;
  check: AiDraftCheck;
}

/** The example data, once, in a throwaway data home (deleted on exit). */
let example: Promise<{ store: Store }> | null = null;
function exampleStore(): Promise<{ store: Store }> {
  example ??= (async () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'bragdoc-eval-draft-'));
    process.on('exit', () => fs.rmSync(root, { recursive: true, force: true }));
    const home = path.join(root, '.bragdoc');
    fs.mkdirSync(home);
    const store = new Store(home).load();
    const services = createServices(store);
    services.profile.set({ name: 'Alex Marlowe', role: 'Staff engineer' });
    await addExample(store, services, { asOf: AS_OF });
    return { store };
  })();
  return example;
}

export async function prepareCase(i: Input): Promise<PreparedDraft> {
  const { store } = await exampleStore();
  const folio: FolioFilter = { from: i.from, to: i.to, projects: [], minImpact: 0, exclude: [], group: 'project' };
  return prepareDraft({ data: folioData(store, i.from, i.to), folio, purpose: i.purpose, role: store.profile()?.role ?? null, style: null, contextTokens: i.contextTokens });
}

const bullets = (draft: string) => draft.split('\n').filter((l) => /^\s{0,3}(?:[-*+]|\d{1,3}[.)])\s+/.test(l));

export const DRAFT_EVAL: EvalSpec<Input, Answer> = {
  name: 'draft',
  feature: 'draft',
  description: 'Folio drafts from three synthetic folios: citations, ungrounded facts, filler and time.',
  cases: [
    { id: 'quarter', input: { label: 'last quarter', from: '2026-07-01', to: '2026-09-30', contextTokens: 8192, purpose: 'for my self-review' } },
    { id: 'six-months', input: { label: 'the last six months', from: '2026-04-18', to: AS_OF, contextTokens: 8192, purpose: 'a promotion case' } },
    { id: 'year-budget', input: { label: 'a year, on a 4k context', from: '2025-10-18', to: AS_OF, contextTokens: 4096, purpose: 'my annual review' } },
  ],
  async run(c, ask) {
    const prepared = await prepareCase(c.input);
    const draft = await ask.text({ system: prepared.system, prompt: prepared.prompt, maxOutputTokens: prepared.budget.answerTokens, timeoutMs: 15 * 60_000 });
    if (process.argv.includes('--show')) process.stdout.write(`\n---- ${c.id} (${prepared.sent} sent, ${prepared.omitted} left out)\n${draft}\n`);
    return { draft, prepared, check: checkDraft(draft, prepared.sources) };
  },
  score(_c, a) {
    const bs = bullets(a.draft);
    const cited = bs.filter((b) => citations(b).length).length;
    const n = flagCount(a.check);
    return {
      pass: bs.length > 0 && n === 0,
      cells: {
        sent: `${a.prepared.sent}${a.prepared.omitted ? ` (+${a.prepared.omitted} left out)` : ''}`,
        bullets: bs.length,
        cited: bs.length ? `${Math.round((100 * cited) / bs.length)}%` : '–',
        ungrounded: a.check.ungrounded.map((f) => f.text).join(', ') || 0,
        filler: a.check.filler.map((f) => f.text).join(', ') || 0,
        'bad [n]': a.check.badCitations.length,
        chars: a.draft.length,
      },
    };
  },
  summarise: (rows) => ({ 'clean drafts': `${rows.filter((r) => r.pass).length} of ${rows.length}` }),
};

if (isMain(import.meta.url)) process.exitCode = await main(DRAFT_EVAL);
