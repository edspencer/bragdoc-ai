// One candidate in Found (SPEC R7): where it came from, what it is (a PR slab, an agent's text, evidence), which rules
// it passed, the projects and repos it probably goes with, and Keep · Merge into… · Dismiss. No confidence stamp and no
// verdict: with AI off (the default, D8) the card shows the plain rules that let it through, and says AI is off (SPEC
// R26); the judge's verdicts are PR25's. Adapted from the Scrapbook
// prototype's FoundCard (Found.tsx), without its Slack body and its judge.
import type { ProjectEntry, RepoEntry } from '../../shared/api.ts';
import type { FoundCandidate } from '../../shared/schema/index.ts';
import { foundPictureUrl } from '../api/client.ts';
import { useAiOn } from '../api/queries.ts';
import { toView } from '../board/evidence.ts';
import { Btn, EvidenceBit, Hand, ImpactBadge, Kicker, Print, ProjectPill, ProvenanceBadge, RepoTag, StickyQuote, type Provenance } from '../kit/index.ts';
import { fmt, todayIso } from '../lib/dates.ts';
import type { Decision } from './decide.ts';
import { MergeInto } from './MergeInto.tsx';

export const PROVENANCE_OF: Record<FoundCandidate['source'], Exclude<Provenance, 'manual'>> = { github: 'github', screenshots: 'screenshot', mcp: 'mcp' };

/** Who found it, for the line under the rules. */
const FOUND_BY: Record<FoundCandidate['source'], string> = { github: 'the GitHub source', screenshots: 'the screenshots folder', mcp: 'an agent over MCP' };

/** "14:02" in this browser's time zone. */
export const clock = (iso: string) => new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

export function FoundCard({
  c,
  projects,
  repos,
  busy,
  onDecide,
}: {
  c: FoundCandidate;
  projects: ReadonlyMap<string, ProjectEntry>;
  repos: ReadonlyMap<string, RepoEntry>;
  busy: boolean;
  onDecide: (d: Decision) => void;
}) {
  const pills = c.suggestedProjects.map((id) => projects.get(id)).filter((p): p is ProjectEntry => !!p);
  const repoTags = c.suggestedRepos.map((id) => repos.get(id)).filter((r): r is RepoEntry => !!r);
  const blurb = c.summary || c.body?.trim();
  const aiOn = useAiOn();
  return (
    <article className="sb-card relative mb-8 inline-block w-full break-inside-avoid rounded-3xl p-5" data-testid="found-card" data-id={c.id} data-key={c.externalKey} aria-labelledby={`f-${c.id}`}>
      <div className="flex flex-wrap items-center gap-2">
        <ProvenanceBadge source={PROVENANCE_OF[c.source]} agent={c.sourceAgent} variant="solid" />
        <span className="text-[12px] text-faint">
          found {fmt.relative(todayIso(new Date(c.foundAt)))}, {clock(c.foundAt)}
        </span>
        <Hand className="ml-auto text-[18px] text-muted">{fmt.short(c.happenedAt)}</Hand>
      </div>

      <h3 id={`f-${c.id}`} className="m-0 mt-4 font-grotesk text-[21px] font-bold leading-tight break-words">
        {c.title}
      </h3>
      {c.source === 'screenshots' ? (
        <ScreenshotBody c={c} />
      ) : (
        <>
      {blurb && <p className="m-0 mt-1.5 line-clamp-4 whitespace-pre-line text-[14px] leading-relaxed text-muted break-words">{blurb}</p>}
      {c.evidence.length > 0 && (
        <div className="mt-4 space-y-2">
          {c.evidence.map((e) => (
            <EvidenceBit key={e.id} e={toView(e, {})} id={e.id} />
          ))}
        </div>
      )}
      {c.files.length > 0 && (
        <ul className="m-0 mt-3 list-none space-y-1 p-0 text-[12.5px] text-muted">
          {c.files.map((f) => (
            <li key={f.path} className="truncate">
              📎 {f.title || f.path.split(/[\\/]/).pop()} <span className="text-faint">(copied in when you keep it)</span>
            </li>
          ))}
        </ul>
      )}
        </>
      )}
      {c.source === 'mcp' && <div className="mt-3 font-hand text-[19px] text-[#6a4fd0] dark:text-[#b7a4ff]">{c.sourceAgent || 'An agent'} suggested this, so it’s waiting for your OK.</div>}

      {c.matchedRules.length > 0 && (
        <div className="mt-4 rounded-2xl border-2 border-dashed border-line p-3.5" data-testid="found-rules">
          <Kicker>Passed the rules</Kicker>
          <ul className="m-0 mt-2 flex list-none flex-wrap gap-1.5 p-0">
            {c.matchedRules.map((r) => (
              <li key={r} className="rounded-full bg-sunk px-2.5 py-0.5 text-[11.5px] font-medium text-muted">
                ✓ {r}
              </li>
            ))}
          </ul>
        </div>
      )}
      <div className="mt-3 text-[11.5px] text-faint">Found by {FOUND_BY[c.source]} · plain rules{aiOn ? '' : ' · AI off'}</div>

      {(pills.length > 0 || repoTags.length > 0 || c.impact) && (
        <div className="mt-4 flex flex-wrap items-center gap-1.5">
          <span className="mr-1 text-[11px] font-bold uppercase tracking-wider text-faint">Goes with</span>
          {pills.map((p) => (
            <ProjectPill key={p.id} name={p.name} color={p.color} />
          ))}
          {repoTags.map((r) => (
            <RepoTag key={r.id} repo={r.name} />
          ))}
          {c.impact && (
            <span className="ml-auto">
              <ImpactBadge n={c.impact} />
            </span>
          )}
        </div>
      )}
      <div className="relative mt-5 flex flex-wrap items-center gap-2">
        <Btn kind="go" onClick={() => onDecide({ action: 'keep' })} disabled={busy} data-testid="found-keep">
          Keep
        </Btn>
        <MergeInto disabled={busy} onPick={(a) => onDecide({ action: 'merge', achievementId: a.id, title: a.title })} />
        <Btn kind="ghost" className="ml-auto" onClick={() => onDecide({ action: 'dismiss' })} disabled={busy} data-testid="found-dismiss">
          Dismiss
        </Btn>
      </div>
    </article>
  );
}

/**
 * A screenshot: the picture itself (read from where it is: it's only copied in when you keep it), with the words the
 * rules passed on a sticky over its corner. Adapted from the prototype's ScreenshotBody (Found.tsx).
 */
function ScreenshotBody({ c }: { c: FoundCandidate }) {
  const quote = c.evidence.find((e) => e.kind === 'quote')?.quote;
  const file = c.files[0];
  return (
    <div className="relative mt-4 pb-1" data-testid="found-screenshot">
      {file && (
        <div className="w-[86%]">
          <Print
            src={foundPictureUrl(c.id)}
            alt={file.title ?? 'The screenshot'}
            caption={file.title}
            tiltId={c.id}
            small
            brokenText="The screenshot isn’t where it was (moved or deleted). Keeping it keeps the quote."
          />
        </div>
      )}
      {quote && (
        <div className={`relative ml-auto w-[80%] ${file ? '-mt-8' : ''}`} data-testid="found-quote">
          <div className="pointer-events-none absolute -top-4 left-3 z-10 rounded-full bg-surface px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-faint ring-1 ring-line">Read on this computer</div>
          <StickyQuote text={quote.text} from={quote.from} where={quote.where} rotate={1.2} />
        </div>
      )}
    </div>
  );
}