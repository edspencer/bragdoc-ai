// The folio printout: the document as it will read, on a sheet of paper under a clipboard clip. It's drawn from the
// same FolioDoc the markdown is made from (shared/folio.ts), so what you see is what you export. The print stylesheet
// (folio.css) prints this sheet and nothing else. Adapted from the Scrapbook prototype's Folio.tsx ("the folio sheet").
import type { FolioDoc, FolioEvidence, FolioLine } from '../../shared/folio.ts';
import { whenOf } from '../../shared/folio.ts';
import { safeColour } from '../lib/colour.ts';

function EvidenceLine({ e }: { e: FolioEvidence }) {
  const link = (href: string | undefined, label: string) =>
    href ? (
      <a href={href} target="_blank" rel="noreferrer noopener" className="underline decoration-[#b8afa1] underline-offset-2 hover:decoration-current">
        {label}
      </a>
    ) : (
      label
    );
  switch (e.kind) {
    case 'github_pr':
      return <li>PR: {link(e.url, e.title ? `${e.ref}: ${e.title}` : e.ref)}</li>;
    case 'url':
      return <li>Link: {e.url ? link(e.url, e.title || e.domain || 'a link') : `${e.title || 'a link'} (a local address, left out)`}</li>;
    case 'quote':
      return null; // drawn as a blockquote under the item
    default:
      return (
        <li>
          {{ image: 'Screenshot', pdf: 'Document', file: 'File' }[e.kind]}: {e.name ?? { image: 'a picture', pdf: 'a PDF', file: 'a file' }[e.kind]}
        </li>
      );
  }
}

function Item({ a, showProjects }: { a: FolioLine; showProjects: boolean }) {
  const quotes = a.evidence.filter((e): e is Extract<FolioEvidence, { kind: 'quote' }> => e.kind === 'quote');
  const rest = a.evidence.filter((e) => e.kind !== 'quote');
  return (
    <li className="break-inside-avoid" data-testid="folio-sheet-item">
      <b className="break-words">{a.title}</b>{' '}
      <span className="text-[#8c8478]">
        · {whenOf(a)}
        {showProjects && a.projectNames.length ? ` · ${a.projectNames.join(', ')}` : ''}
        {a.impact ? ` · impact ${a.impact}/10` : ''}
      </span>
      {a.summary && <div className="break-words text-[#5c554b]">{a.summary}</div>}
      {rest.length > 0 && (
        <ul className="m-0 mt-0.5 list-[circle] pl-5 text-[12.5px] text-[#5c554b]">
          {rest.map((e, i) => (
            <EvidenceLine key={i} e={e} />
          ))}
        </ul>
      )}
      {quotes.map((q, i) => (
        <blockquote key={i} className="m-0 mt-1.5 border-l-[3px] border-[#d9cfbf] pl-3 italic text-[#5c554b]">
          “{q.text}”{(q.from || q.where) && <span className="not-italic text-[#8c8478]"> — {[q.from, q.where].filter(Boolean).join(', ')}</span>}
        </blockquote>
      ))}
    </li>
  );
}

/** `empty`: nothing in the window matches at all (so there's nothing to tick). */
export function Sheet({ doc, empty }: { doc: FolioDoc; empty?: boolean }) {
  return (
    <div className="relative mt-8">
      <div aria-hidden className="folio-clip-top absolute -top-4 left-1/2 z-10 h-8 w-24 -translate-x-1/2 rounded-t-lg bg-gradient-to-b from-[#6e6a64] to-[#3a3733] shadow-md dark:from-[#5a554e] dark:to-[#2a2723]">
        <div className="mx-auto mt-2 h-1.5 w-14 rounded-full bg-black/30" />
      </div>
      <article className="folio-sheet sb-print rounded-sm sm:rotate-[0.4deg] px-6 pb-10 pt-10 text-[#24201b] sm:px-10" data-testid="folio-sheet">
        <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#8c8478]">Folio</div>
        <h2 className="m-0 mt-1 break-words font-grotesk text-[26px] font-extrabold leading-tight">{doc.title}</h2>
        <div className="font-hand mt-1 text-[19px] text-[#6d655a]">{doc.dates}</div>
        {doc.scope.length > 0 && <div className="mt-0.5 text-[12.5px] text-[#8c8478]">{doc.scope.join(' · ')}</div>}
        {doc.count === 0 && <div className="mt-8 text-[14px] italic text-[#8c8478]">{empty ? 'Nothing to put on it yet.' : 'Nothing picked yet. Tick a few clippings.'}</div>}
        {doc.sections.map((s) => (
          <section key={s.key} className="mt-6" data-testid="folio-sheet-section">
            <h3 className="m-0 flex flex-wrap items-center gap-x-2 font-grotesk text-[16px] font-extrabold">
              {s.color && <span aria-hidden className="size-3 shrink-0 rounded-sm" style={{ background: safeColour(s.color) }} />}
              <span className="min-w-0 break-words">{s.heading}</span>
              {s.aside && <span className="text-[12.5px] font-semibold text-[#8c8478]">{s.aside}</span>}
            </h3>
            <ul className="m-0 mt-2 list-disc space-y-2.5 pl-5 text-[13.5px] leading-relaxed marker:text-[#b8afa1]">
              {s.items.map((a) => (
                <Item key={a.id} a={a} showProjects={doc.group !== 'project'} />
              ))}
            </ul>
          </section>
        ))}
      </article>
    </div>
  );
}
