// /dev/kit: every piece of the Scrapbook kit on one page, for building pages against and for comparing with the
// design prototype in both themes (flip the theme in the header). Only in dev and BRAGDOC_KIT=1 builds (D33).
// Everything shown is invented: Alex Marlowe, Altimetry and the `*.example` links are the synthetic example world.
import { useState, type ReactNode } from 'react';
import { PenLine } from 'lucide-react';
import {
  Btn,
  Card,
  ColourPicker,
  CountBadge,
  Dot,
  EvidenceBit,
  Field,
  FileChip,
  FilterChip,
  GithubMark,
  Hand,
  ImpactBadge,
  Kicker,
  LinkBtn,
  LinkCard,
  Masonry,
  NotebookTab,
  NotebookTabs,
  PROVENANCE,
  PageTitle,
  Panel,
  PdfChip,
  PrSlab,
  Print,
  ProjectPill,
  ProvenanceBadge,
  Receipt,
  RepoTag,
  Ruled,
  SectionTitle,
  Stamp,
  Sticky,
  StickyQuote,
  Switch,
  TextArea,
  TextInput,
  WeekHeader,
  useToast,
  type BtnKind,
  type EvidenceView,
  type Provenance,
} from '../kit/index.ts';
import { PROJECT_SWATCHES, inkOn } from '../lib/colour.ts';
import { addDays, fmt, groupByWeek, todayIso, weekStart } from '../lib/dates.ts';
import { Mark, Wordmark } from '../shell/Logo.tsx';
import { ThemeToggle } from '../shell/ThemeToggle.tsx';
import { useTheme } from '../theme/theme.tsx';
import preflightUi from './fixtures/preflight-ui.svg';
import searchLatency from './fixtures/search-latency.svg';

const PROJECTS = {
  preflight: { name: 'Pre-flight checklist', color: '#ef5a3c' },
  search: { name: 'Search relevance', color: '#3b6cf6' },
  billing: { name: 'Billing migration', color: '#f5a524' },
  ramp: { name: 'Onboarding ramp', color: '#2fb37e' },
};
type ProjectId = keyof typeof PROJECTS;

interface DemoAchievement {
  id: string;
  date: string;
  title: string;
  summary?: string;
  impact: number;
  projects: ProjectId[];
  repos: string[];
  source: Provenance;
  agent?: string;
  evidence: EvidenceView[];
}

function demoAchievements(today: string): DemoAchievement[] {
  const thisWeek = weekStart(today);
  return [
    {
      id: 'a1',
      date: thisWeek,
      title: 'Shipped offline sync for the pre-flight checklist',
      summary: 'Crews can finish a checklist with no signal; it syncs when the tablet is back online.',
      impact: 8,
      projects: ['preflight'],
      repos: ['altimetry/preflight-app'],
      source: 'manual',
      evidence: [
        { kind: 'image', src: preflightUi, alt: 'Screenshot of the tablet pre-flight checklist, offline with 3 changes queued', caption: 'Offline, 3 queued, nothing lost' },
        { kind: 'github_pr', repo: 'altimetry/preflight-app', number: 212, title: 'Queue checklist edits while offline', url: 'https://github.example/altimetry/preflight-app/pull/212', mergedAt: thisWeek, additions: 412, deletions: 96 },
      ],
    },
    {
      id: 'a2',
      date: addDays(thisWeek, 1),
      title: 'Cut search p95 latency from 480 ms to 190 ms',
      impact: 9,
      projects: ['search'],
      repos: ['altimetry/search-service'],
      source: 'mcp',
      agent: 'Claude Code',
      evidence: [{ kind: 'image', src: searchLatency, alt: 'Dashboard: search p95 latency over eight weeks', caption: 'The re-ranker went out on the 25th' }],
    },
    {
      id: 'a3',
      date: addDays(thisWeek, 2),
      title: 'Praised in the all-hands for the billing cutover',
      impact: 6,
      projects: ['billing'],
      repos: [],
      source: 'screenshot',
      evidence: [{ kind: 'quote', text: 'Zero failed invoices on cutover night. Alex made it look easy.', from: 'Dana Whitfield', where: 'all-hands notes' }],
    },
    {
      id: 'a4',
      date: addDays(thisWeek, -5),
      title: 'Wrote the onboarding guide for new on-call engineers',
      summary: 'Twelve pages; two new starters used it for their first week on call.',
      impact: 5,
      projects: ['ramp'],
      repos: ['altimetry/handbook'],
      source: 'import',
      evidence: [
        { kind: 'pdf', title: 'On-call onboarding guide', pages: 12, bytes: 1_240_000 },
        { kind: 'link', url: 'https://wiki.altimetry.example/oncall/start-here', title: 'Start here: on call' },
      ],
    },
    {
      id: 'a5',
      date: addDays(thisWeek, -3),
      title: 'Merged the invoice retry worker',
      impact: 4,
      projects: ['billing', 'search'],
      repos: ['altimetry/billing'],
      source: 'github',
      evidence: [
        { kind: 'github_pr', repo: 'altimetry/billing', number: 88 },
        { kind: 'file', name: 'retry-runbook.key', bytes: 3_400_000 },
      ],
    },
  ];
}

/** How the board's cards will look (PR7 builds the real one): kit pieces composed, nothing more. */
function DemoCard({ a, fresh }: { a: DemoAchievement; fresh?: boolean }) {
  const img = a.evidence.find((e) => e.kind === 'image');
  const rest = a.evidence.filter((e) => e !== img);
  return (
    <Card tape={PROJECTS[a.projects[0]].color} fresh={fresh}>
      {img && (
        <div className="mb-4 mt-1">
          <EvidenceBit e={img} id={a.id} />
        </div>
      )}
      <div className="flex items-center gap-2">
        <Hand className="text-[19px] leading-none text-muted">
          {fmt.dowShort(a.date)} {fmt.short(a.date)}
        </Hand>
        {fresh && <span className="rounded-full bg-accent px-2 py-0.5 text-[10.5px] font-bold text-accent-ink">new</span>}
        <span className="ml-auto">
          <ImpactBadge n={a.impact} />
        </span>
      </div>
      <h3 className="m-0 mt-1.5 font-grotesk text-[19px] font-bold leading-[1.2] tracking-[-0.01em]">{a.title}</h3>
      {a.summary && <p className="m-0 mt-1.5 text-[13.5px] leading-relaxed text-muted">{a.summary}</p>}
      {rest.length > 0 && (
        <div className="mt-3.5 space-y-2.5">
          {rest.map((e, i) => (
            <EvidenceBit key={i} e={e} id={a.id + i} />
          ))}
        </div>
      )}
      <div className="mt-4 flex flex-wrap items-center gap-1.5">
        {a.projects.map((p) => (
          <ProjectPill key={p} {...PROJECTS[p]} />
        ))}
        {a.repos.map((r) => (
          <RepoTag key={r} repo={r} />
        ))}
        <ProvenanceBadge source={a.source} agent={a.agent} />
      </div>
    </Card>
  );
}

function Section({ id, title, sub, children }: { id: string; title: string; sub?: ReactNode; children: ReactNode }) {
  return (
    <section id={id} data-testid={`kit-${id}`} className="mt-14 scroll-mt-6">
      <SectionTitle sub={sub}>{title}</SectionTitle>
      <div className="mt-5">{children}</div>
    </section>
  );
}

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="mt-4 flex flex-wrap items-center gap-3">
      <Kicker className="w-32 shrink-0">{label}</Kicker>
      {children}
    </div>
  );
}

const TOKENS = ['bg', 'surface', 'sunk', 'line', 'faint', 'muted', 'ink', 'accent', 'accent-soft', 'print', 'sticky', 'slab', 'good', 'warn', 'bad'];
const KINDS: BtnKind[] = ['accent', 'go', 'paper', 'ink', 'ghost', 'danger'];

export function Kit() {
  const { dark } = useTheme();
  const toast = useToast();
  const today = todayIso();
  const achievements = demoAchievements(today);
  const [on, setOn] = useState(true);
  const [colour, setColour] = useState<string>('#14a3a3');
  const [filter, setFilter] = useState<'all' | Exclude<Provenance, 'manual'>>('all');
  const [chosen, setChosen] = useState<ProjectId[]>(['search']);

  return (
    <div data-testid="kit-page">
      <PageTitle
        hand={dark ? 'lamplight' : 'daylight'}
        sub="Every piece of the Scrapbook kit, as pages use it. Switch the theme in the header to see both boards. Everything here is invented."
        right={<ThemeToggle />}
      >
        The kit
      </PageTitle>

      <nav aria-label="Kit sections" className="mt-6 flex flex-wrap gap-2 text-[13px] font-semibold">
        {['brand', 'type', 'buttons', 'controls', 'tags', 'paper', 'evidence', 'board', 'feedback', 'tabs'].map((s) => (
          <a key={s} href={`#${s}`} className="rounded-full bg-surface px-3 py-1 text-muted no-underline ring-1 ring-line hover:text-ink">
            {s}
          </a>
        ))}
      </nav>

      <Section id="brand" title="Brand and palette" sub="The tomato mark, the board's tokens, and the four self-hosted fonts.">
        <div className="flex flex-wrap items-center gap-8">
          <div className="flex items-center gap-2">
            <Mark />
            <Wordmark />
          </div>
          <Mark className="size-16" />
        </div>
        <div className="mt-6 grid grid-cols-3 gap-3 sm:grid-cols-5 lg:grid-cols-8">
          {TOKENS.map((t) => (
            <div key={t} className="text-center">
              <div className="h-12 rounded-xl ring-1 ring-line" style={{ background: `var(--${t})` }} />
              <div className="mt-1 font-mono text-[11px] text-muted">{t}</div>
            </div>
          ))}
        </div>
        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          <div className="font-sans text-[17px]">Instrument Sans: the body text, plain and friendly.</div>
          <div className="font-grotesk text-[22px] font-extrabold tracking-tight">Bricolage Grotesque, for headings</div>
          <Hand className="text-[26px]">Caveat, for handwritten asides</Hand>
          <div className="font-mono text-[14px]">Geist Mono: ~/.bragdoc/achievements</div>
        </div>
      </Section>

      <Section id="type" title="Type">
        <Card className="pb-6">
          <PageTitle hand="3 waiting" sub="The page title, with a handwritten aside, a sub line, and actions on the right." right={<Btn size="sm">An action</Btn>}>
            Page title
          </PageTitle>
          <div className="mt-8 space-y-5">
            <SectionTitle sub="A section heading, with a line of explanation under it.">Section title</SectionTitle>
            <Kicker>Kicker over a group</Kicker>
            <Hand rotate={-2} className="text-[30px] text-muted">
              All caught up. Go do something brilliant.
            </Hand>
          </div>
        </Card>
      </Section>

      <Section id="buttons" title="Buttons" sub="Accent is the page's main action; go confirms; paper is everything else.">
        <Row label="Kinds">
          {KINDS.map((k) => (
            <Btn key={k} kind={k}>
              {k}
            </Btn>
          ))}
        </Row>
        <Row label="Small">
          {KINDS.map((k) => (
            <Btn key={k} kind={k} size="sm">
              {k}
            </Btn>
          ))}
        </Row>
        <Row label="Disabled">
          <Btn kind="accent" disabled>
            Save
          </Btn>
          <Btn disabled>Cancel</Btn>
        </Row>
        <Row label="Router link">
          <LinkBtn to="/found" kind="accent">
            Open Found →
          </LinkBtn>
          <LinkBtn to="/settings/$tab" params={{ tab: 'sources' }}>
            Choose sources
          </LinkBtn>
        </Row>
      </Section>

      <Section id="controls" title="Controls">
        <Row label="Switch">
          <Switch on={on} onChange={setOn} label="Demo switch" />
          <Switch on={!on} onChange={(v) => setOn(!v)} label="Demo switch, opposite" />
          <Switch on={false} onChange={() => {}} label="Disabled switch" disabled />
        </Row>
        <Row label="Status dots">
          <span className="flex items-center gap-2 text-[13px]">
            <Dot tone="good" /> watching
          </span>
          <span className="flex items-center gap-2 text-[13px]">
            <Dot tone="warn" /> rate-limited
          </span>
          <span className="flex items-center gap-2 text-[13px]">
            <Dot tone="bad" /> couldn&apos;t connect
          </span>
          <span className="flex items-center gap-2 text-[13px]">
            <Dot tone="off" /> off
          </span>
        </Row>
        <Row label="Count badge">
          <CountBadge n={3} />
          <CountBadge n={128} />
        </Row>
        <Row label="Theme">
          <ThemeToggle />
        </Row>
        <div className="mt-6 grid max-w-3xl gap-4 sm:grid-cols-2">
          <Field label="Your name" hint="Used to spot praise for you in screenshots.">
            <TextInput placeholder="Alex Marlowe" />
          </Field>
          <Field label="Repo" error="That folder isn't a git repository.">
            <TextInput defaultValue="~/Code/not-a-repo" aria-invalid />
          </Field>
          <div className="sm:col-span-2">
            <Field label="What happened">
              <TextArea placeholder="Unblocked the release on Tuesday." />
            </Field>
          </div>
        </div>
        <Row label="Filter chips">
          <FilterChip on={filter === 'all'} onClick={() => setFilter('all')} label="Everything" count={7} />
          {(['github', 'screenshot', 'mcp'] as const).map((k) => (
            <FilterChip key={k} on={filter === k} onClick={() => setFilter(k)} label={PROVENANCE[k].short} count={k === 'github' ? 4 : k === 'mcp' ? 1 : 2} color={PROVENANCE[k].bg} />
          ))}
        </Row>
        <div className="mt-6">
          <ColourPicker value={colour} onChange={setColour} />
          <div className="mt-3 flex items-center gap-3">
            <ProjectPill name="This project" color={colour} />
            <span className="font-mono text-[12px] text-muted">
              text on it: {inkOn(colour) === '#ffffff' ? 'white' : 'black'}
            </span>
          </div>
        </div>
      </Section>

      <Section id="tags" title="Tags" sub="Project pills pick black or white text by luminance, and keep their colour in both themes.">
        <Row label="Every swatch">
          {PROJECT_SWATCHES.map((c) => (
            <ProjectPill key={c} name={c} color={c} />
          ))}
        </Row>
        <Row label="Toggle / suggest">
          {(Object.keys(PROJECTS) as ProjectId[]).map((p) => (
            <ProjectPill key={p} {...PROJECTS[p]} active={chosen.includes(p)} onClick={() => setChosen((c) => (c.includes(p) ? c.filter((x) => x !== p) : [...c, p]))} />
          ))}
        </Row>
        <Row label="Repo">
          <RepoTag repo="altimetry/preflight-app" />
          <RepoTag repo="handbook" />
        </Row>
        <Row label="Impact">
          {[1, 3, 5, 8, 10].map((n) => (
            <ImpactBadge key={n} n={n} />
          ))}
        </Row>
        <Row label="Provenance">
          <ProvenanceBadge source="github" />
          <ProvenanceBadge source="screenshot" />
          <ProvenanceBadge source="mcp" agent="Claude Code" />
          <ProvenanceBadge source="import" />
        </Row>
        <Row label="Solid (Found)">
          <ProvenanceBadge source="github" variant="solid" />
          <ProvenanceBadge source="screenshot" variant="solid" />
          <ProvenanceBadge source="mcp" agent="Claude Code" variant="solid" />
          <ProvenanceBadge source="import" variant="solid" />
        </Row>
      </Section>

      <Section id="paper" title="Paper">
        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
          <Card tape="#3b6cf6">
            <Kicker>Card</Kicker>
            <p className="m-0 mt-2 text-[14px] text-muted">Card stock with tape in a project colour.</p>
          </Card>
          <Card tape="#2fb37e" fresh>
            <Kicker>Fresh card</Kicker>
            <p className="m-0 mt-2 text-[14px] text-muted">Just added: a ring and a pop-in.</p>
          </Card>
          <Card tape="#a25ddc" tapeAt="right" tiltId="kit-tilted">
            <Kicker>Tilted, tape right</Kicker>
            <p className="m-0 mt-2 text-[14px] text-muted">A stable tilt from its id.</p>
          </Card>
          <Panel tape="#ef5a3c">
            <SectionTitle as="h3" sub="Settings and forms sit on panels.">
              Panel
            </SectionTitle>
          </Panel>
          <Sticky>
            <div className="font-grotesk text-[16px] font-extrabold">Everything&apos;s switched off.</div>
            <div className="mt-1 text-[13.5px]">A sticky note, for asides that matter.</div>
          </Sticky>
          <StickyQuote text="Thanks for staying late on the cutover. It went perfectly." from="Dana Whitfield" where="email" />
        </div>
        <Row label="Stamps">
          <Stamp color="var(--good)">api.github.com</Stamp>
          <Stamp color="#3b6cf6" rotate={-3}>
            local
          </Stamp>
          <Stamp color="var(--bad)" rotate={2}>
            denied
          </Stamp>
        </Row>
        <div className="mt-8 grid gap-8 md:grid-cols-2">
          <Receipt>
            <div className="text-center font-bold">NETWORK ACTIVITY</div>
            <div className="mt-3 flex justify-between gap-4">
              <span>10:42 GET api.github.com</span>
              <span>200</span>
            </div>
            <div className="flex justify-between gap-4">
              <span>10:42 gh search prs</span>
              <span>via gh</span>
            </div>
            <div className="mt-3 border-t border-dashed border-current pt-2 text-center">TO BRAGDOC&apos;S MAKERS: 0 B</div>
          </Receipt>
          <Ruled>
            <div className="font-bold">A ruled index card</div>
            <div>Lines sit on the rules.</div>
            <div>For notes and instructions.</div>
          </Ruled>
        </div>
      </Section>

      <Section id="evidence" title="Evidence" sub="Every kind an achievement can carry. Click the print for the lightbox.">
        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
          <div className="max-w-sm">
            <Print src={searchLatency} alt="Dashboard: search p95 latency over eight weeks" caption="p95 halved in a week" tiltId="kit-print" />
          </div>
          <div className="space-y-3">
            <PrSlab repo="altimetry/preflight-app" number={212} title="Queue checklist edits while offline" mergedAt={today} additions={412} deletions={96} />
            <PrSlab repo="altimetry/billing" number={88} />
            <Hand className="text-[17px] text-muted">↑ GitHub not connected: just owner/repo#n</Hand>
          </div>
          <div className="space-y-3">
            <PdfChip title="Q3 incident review" pages={4} bytes={812_000} />
            <FileChip name="retry-runbook.key" bytes={3_400_000} />
            <LinkCard url="https://wiki.altimetry.example/oncall/start-here" title="Start here: on call" />
            <LinkCard url="https://status.altimetry.example/" />
          </div>
        </div>
      </Section>

      <Section id="board" title="A board" sub="Week headers and the masonry, with cards composed from the pieces above.">
        {groupByWeek(achievements).map((w, i) => (
          <div key={w.start} className="mt-10">
            <WeekHeader week={w} index={i} today={today} />
            <Masonry>
              {w.items.map((a) => (
                <DemoCard key={a.id} a={a} fresh={a.id === 'a3'} />
              ))}
            </Masonry>
          </div>
        ))}
      </Section>

      <Section id="feedback" title="Toasts and empty states">
        <Row label="Toast">
          <Btn onClick={() => toast({ msg: 'Pinned to your board.' })}>Plain</Btn>
          <Btn onClick={() => toast({ msg: 'Removed.', undo: () => toast({ msg: 'Put back.' }) })}>With undo</Btn>
          <Btn kind="danger" onClick={() => toast({ msg: "Couldn't save: BragDoc isn't answering.", tone: 'bad' })}>
            Error
          </Btn>
        </Row>
        <Card tape="#ef5a3c" className="mx-auto mt-8 max-w-3xl rotate-[-0.8deg] px-6 pb-7 pt-8 sm:px-10">
          <h2 className="m-0 font-grotesk text-[32px] font-extrabold leading-tight tracking-tight">Your board is empty. For now.</h2>
          <p className="m-0 mt-2 max-w-xl text-[15.5px] leading-relaxed text-muted">An empty state: a taped card, a friendly line, and ghost suggestions.</p>
          <div className="mt-6 grid gap-4 sm:grid-cols-3">
            {[
              { icon: <GithubMark className="size-4" />, tone: '#1d1a17', title: 'Paste a PR link' },
              { icon: <PenLine aria-hidden className="size-4" />, tone: '#2fb37e', title: 'Write one line' },
              { icon: <span className="font-bold">⌘V</span>, tone: '#3b6cf6', title: 'Paste a screenshot' },
            ].map((g, k) => (
              <div key={g.title} className="rounded-2xl border-[2.5px] border-dashed border-line p-4" style={{ transform: `rotate(${[-1, 0.8, -0.4][k]}deg)` }}>
                <span className="flex size-9 items-center justify-center rounded-full text-[11px] text-white dark:ring-1 dark:ring-white/10" style={{ background: g.tone }}>
                  {g.icon}
                </span>
                <div className="mt-3 font-grotesk text-[16px] font-bold leading-snug">{g.title}</div>
              </div>
            ))}
          </div>
        </Card>
      </Section>

      <Section id="tabs" title="Notebook tabs" sub="Settings' dividers. They're router links: the current page's tab is lifted.">
        <div className="grid items-start gap-6 lg:grid-cols-[220px_minmax(0,1fr)]">
          <NotebookTabs label="Demo tabs">
            <NotebookTab to="/dev/kit" color="#7a3e7f">
              This page
            </NotebookTab>
            <NotebookTab to="/settings/$tab" params={{ tab: 'network' }} color="#3b6cf6">
              Network activity
            </NotebookTab>
            <NotebookTab to="/settings/$tab" params={{ tab: 'about' }} color="#ef5a3c">
              About &amp; verify
            </NotebookTab>
          </NotebookTabs>
          <Panel>
            <p className="m-0 text-[14px] text-muted">The tab&apos;s page sits here.</p>
          </Panel>
        </div>
      </Section>
    </div>
  );
}
