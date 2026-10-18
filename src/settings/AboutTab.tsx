// Settings → About & verify (SPEC R14, D36): what this build says about itself (dist/build-info.json, via /api/meta)
// on a luggage tag, and the commands that check it independently. A build can't verify itself (anyone can write
// build-info.json), so nothing here ever says "verified": an official build is one that *claims* to come from the
// release workflow, and every other build says "unofficial build". The commands are RELEASING.md's. Adapted from the
// prototype's About (Settings.tsx): its luggage tag and command slabs, without its "Verified" stamp.
import type { ReactNode } from 'react';
import type { BuildInfo } from '../../shared/api.ts';
import { useMeta } from '../api/queries.ts';
import { Hand, Kicker, LinkBtn, SectionTitle, Stamp } from '../kit/index.ts';
import { CommandSlab, LoadError, Loading } from './common.tsx';

const REPO = 'edspencer/bragdoc-ai';
const IMAGE = 'ghcr.io/edspencer/bragdoc';
const PACKAGE = '@bragdoc/local';

/** A version as it may appear in a shell command; anything odd (a hand-edited build-info.json) becomes a placeholder. */
const cmdVersion = (v: string) => (/^[0-9A-Za-z.+-]{1,64}$/.test(v) ? v : '<version>');
/** Only a GitHub Actions run URL is linked; anything else in the file is shown as text. */
const runLink = (u: string | null) => (u && /^https:\/\/github\.com\/[\w.-]+\/[\w.-]+\/actions\/runs\/\d+(?:\/[\w/]*)?$/.test(u) ? u : null);

const builtFmt = new Intl.DateTimeFormat(undefined, { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', timeZoneName: 'short' });
function fmtBuilt(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? iso : builtFmt.format(d);
}

export function AboutTab() {
  const meta = useMeta();
  return (
    <div className="space-y-6" data-testid="settings-about">
      <SectionTitle sub="Which BragDoc this is, and how to check for yourself that it was built from the public source by its release workflow.">About &amp; verify this build</SectionTitle>
      {meta.isPending && <Loading what="build details" />}
      {meta.isError && <LoadError error={meta.error} what="build details" retry={() => void meta.refetch()} />}
      {meta.isSuccess && (
        <div className="grid items-start gap-8 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
          <div>
            <LuggageTag version={meta.data.version} build={meta.data.build} />
            <Hand className="mt-3 block pl-6 text-[18px] text-muted">what this build says about itself</Hand>
          </div>
          <Verify version={meta.data.build?.version ?? meta.data.version} official={meta.data.build?.official === true} />
        </div>
      )}
    </div>
  );
}

function LuggageTag({ version, build }: { version: string; build: BuildInfo | null }) {
  const official = build?.official === true;
  const run = runLink(build?.runUrl ?? null);
  const rows: [string, ReactNode][] = build
    ? [
        ['Package', <span className="font-mono">{build.name}@{build.version}</span>],
        ['Commit', build.commit ? <span className="break-all font-mono" title={build.commit}>{build.commit}</span> : <span className="text-muted">not recorded</span>],
        ['Built', <span className="font-mono">{fmtBuilt(build.builtAt)}</span>],
        [
          'Built by',
          official ? (
            run ? (
              <a href={run} target="_blank" rel="noreferrer noopener" className="font-mono text-accent underline">
                GitHub Actions · release.yml
              </a>
            ) : (
              <span className="font-mono">GitHub Actions · release.yml</span>
            )
          ) : run ? (
            <a href={run} target="_blank" rel="noreferrer noopener" className="font-mono text-accent underline">
              a GitHub Actions run (not a release)
            </a>
          ) : (
            <span>a computer, not the release workflow</span>
          ),
        ],
      ]
    : [];
  return (
    <div className="sb-card relative rotate-[-1deg] rounded-2xl rounded-l-[40px] p-6 pl-12" data-testid="build-tag" data-official={official}>
      <span className="absolute left-5 top-1/2 size-5 -translate-y-1/2 rounded-full ring-4 ring-line" style={{ background: 'var(--holes)' }} aria-hidden />
      <div className="flex flex-wrap items-start gap-3">
        <div className="min-w-0">
          <Kicker>You’re running</Kicker>
          <div className="mt-1 break-words font-grotesk text-[30px] font-extrabold leading-none">BragDoc {version}</div>
          <div className="mt-1 font-mono text-[12.5px] text-muted">{PACKAGE}</div>
        </div>
        <div className="ml-auto mt-1" data-testid="build-stamp">
          {official ? (
            <Stamp color="var(--ink)" rotate={-6}>
              Says: official release
            </Stamp>
          ) : (
            <Stamp color="var(--warn)" rotate={-6}>
              Unofficial build
            </Stamp>
          )}
        </div>
      </div>
      {build ? (
        <dl className="m-0 mt-5 grid grid-cols-[88px_minmax(0,1fr)] gap-x-3 gap-y-2 text-[13px]">
          {rows.map(([k, v]) => (
            <div key={k} className="contents">
              <dt className="text-faint">{k}</dt>
              <dd className="m-0 min-w-0">{v}</dd>
            </div>
          ))}
        </dl>
      ) : (
        <p className="m-0 mt-5 text-[13.5px] leading-relaxed text-muted" data-testid="build-none">
          There’s no build information: this BragDoc is running from its source code, not from a built package, so there’s no release to compare it with.
        </p>
      )}
      {build && build.version !== version && (
        <p className="m-0 mt-4 rounded-lg bg-warn/12 px-3 py-2 text-[12.5px] leading-snug" role="alert">
          The build says it’s {build.version}, but the running server says {version}. The build information doesn’t belong to this copy.
        </p>
      )}
      {build && !official && (
        <p className="m-0 mt-4 text-[12.5px] leading-relaxed text-muted" data-testid="unofficial-why">
          Built on a computer, in a CI check, or from a checkout, rather than by BragDoc’s release workflow. It may be perfectly fine, but nothing ties it to a published release.
        </p>
      )}
    </div>
  );
}

function Verify({ version, official }: { version: string; official: boolean }) {
  const v = cmdVersion(version);
  return (
    <div className="space-y-4" data-testid="verify">
      <div className="text-[13.5px] leading-relaxed text-muted">
        A build can’t vouch for itself, so don’t take its word for it. These check the published release of {PACKAGE}@{v} against the public source, independently of this app:
        {!official && <span className="mt-1 block">This build is unofficial, so they won’t match it: they check what a real release of this version would be.</span>}
      </div>
      <CommandSlab
        kicker="npm signatures"
        command="npm audit signatures"
        note={<>In a project that installed {PACKAGE}: checks the registry’s signatures and provenance for every package there.</>}
        testId="cmd-audit"
      />
      <CommandSlab kicker="npm integrity" command={`npm view ${PACKAGE}@${v} dist.integrity`} note="Compare it with the integrity of the package you installed." testId="cmd-integrity" />
      <CommandSlab kicker="Docker image" command={`gh attestation verify oci://${IMAGE}:${v} -R ${REPO}`} note="Build provenance for the image you pulled." testId="cmd-image" />
      <CommandSlab
        kicker="Release tarball"
        command={`gh attestation verify bragdoc-local-${v}.tgz -R ${REPO}`}
        note="For the tarball attached to the GitHub Release, run where you downloaded it."
        testId="cmd-tarball"
      />
      <div className="rounded-2xl bg-surface/70 p-4 text-[13px] ring-1 ring-line">
        <div className="font-bold">Your data</div>
        <div className="mt-1 text-muted">Whichever build you run, your data stays plain files on this computer.</div>
        <LinkBtn to="/settings/$tab" params={{ tab: 'data' }} size="sm" kind="ghost" className="mt-1 !px-0">
          Where it is →
        </LinkBtn>
      </div>
    </div>
  );
}
