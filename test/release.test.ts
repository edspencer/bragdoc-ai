// The release machinery (PR6): what a build says about itself (scripts/build-info.mjs, GET /api/meta), the source-map
// stripping, and the properties of the package, the image and the release workflow that have to stay true: nothing
// publishes on a push, dry-run is the default, npm goes last, and the container is published on loopback only.
// `npm run smoke:pack` and scripts/smoke-image.sh check the built artifacts themselves.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { describe, test } from 'node:test';
import YAML from 'yaml';
import { buildInfo } from '../scripts/build-info.mjs';
import { stripMaps, stripSourceMappingUrl } from '../scripts/strip-maps.mjs';
import { isBuildInfo, readBuildInfo } from '../server/routes/meta.ts';
import { ROOT, rmTmp, tmpDir } from './fixture.ts';

const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));
const read = (f: string) => fs.readFileSync(path.join(ROOT, f), 'utf8');
const noGit = () => null;

describe('build info', () => {
  test('a build outside the release workflow is unofficial, and says what it can', () => {
    const info = buildInfo({ SOURCE_DATE_EPOCH: '1760000000' }, () => 'abc123');
    assert.deepEqual(info, {
      name: '@bragdoc/local',
      version: pkg.version,
      commit: 'abc123',
      builtAt: '2025-10-09T08:53:20.000Z',
      runUrl: null,
      official: false,
    });
    assert.ok(isBuildInfo(info));
  });

  test('in Actions: the commit and the run come from its environment', () => {
    const env = {
      GITHUB_ACTIONS: 'true',
      GITHUB_SHA: 'f00d',
      GITHUB_SERVER_URL: 'https://github.com',
      GITHUB_REPOSITORY: 'edspencer/bragdoc-ai',
      GITHUB_RUN_ID: '42',
      GITHUB_RUN_ATTEMPT: '2',
    };
    const info = buildInfo(env, () => 'not this one');
    assert.equal(info.commit, 'f00d');
    assert.equal(info.runUrl, 'https://github.com/edspencer/bragdoc-ai/actions/runs/42/attempts/2');
    assert.equal(info.official, false, 'CI is not a release');
    assert.equal(buildInfo({ ...env, BRAGDOC_OFFICIAL_BUILD: '1' }, noGit).official, true);
  });

  test('official needs the run that made it: the flag alone is not enough', () => {
    assert.equal(buildInfo({ BRAGDOC_OFFICIAL_BUILD: '1' }, noGit).official, false);
    // the Docker build: no Actions environment, the run passed in as a build arg
    const docker = buildInfo({ BRAGDOC_OFFICIAL_BUILD: '1', BRAGDOC_BUILD_RUN_URL: 'https://github.com/x/y/actions/runs/1', GITHUB_SHA: 'f00d' }, noGit);
    assert.equal(docker.official, true);
    assert.equal(docker.commit, 'f00d');
  });

  test('no commit is null, a missing SOURCE_DATE_EPOCH is now, and a malformed one is an error', () => {
    const before = Date.now();
    const info = buildInfo({}, noGit);
    assert.equal(info.commit, null);
    assert.ok(Date.parse(info.builtAt) >= before - 1000);
    assert.throws(() => buildInfo({ SOURCE_DATE_EPOCH: 'yesterday' }, noGit), /SOURCE_DATE_EPOCH/);
  });

  test('/api/meta passes on a well-formed build-info.json, and nothing else', () => {
    const d = tmpDir();
    try {
      const f = path.join(d, 'build-info.json');
      assert.equal(readBuildInfo(f), null, 'missing');
      fs.writeFileSync(f, '{not json');
      assert.equal(readBuildInfo(f), null, 'unparseable');
      fs.writeFileSync(f, JSON.stringify({ version: '1.0.0', official: 'yes' }));
      assert.equal(readBuildInfo(f), null, 'the wrong shape');
      const good = buildInfo({}, () => 'abc');
      fs.writeFileSync(f, JSON.stringify(good));
      assert.deepEqual(readBuildInfo(f), good);
    } finally {
      rmTmp(d);
    }
  });
});

describe('strip-maps', () => {
  test('removes the comment forms, and only them', () => {
    const js = 'console.log("//# sourceMappingURL=not-a-comment");\nfoo();\n//# sourceMappingURL=index.js.map\n';
    assert.equal(stripSourceMappingUrl(js), 'console.log("//# sourceMappingURL=not-a-comment");\nfoo();\n');
    assert.equal(stripSourceMappingUrl('a{}\n/*# sourceMappingURL=a.css.map */\n'), 'a{}\n');
    assert.equal(stripSourceMappingUrl('x\n//@ sourceMappingURL=old.map'), 'x\n');
  });

  test('deletes .map files and strips the files that pointed at them', () => {
    const d = tmpDir();
    try {
      fs.mkdirSync(path.join(d, 'web', 'assets'), { recursive: true });
      fs.writeFileSync(path.join(d, 'web', 'assets', 'a.js'), 'a();\n//# sourceMappingURL=a.js.map\n');
      fs.writeFileSync(path.join(d, 'web', 'assets', 'a.js.map'), '{}');
      fs.writeFileSync(path.join(d, 'cli.d.ts'), 'export {};\n//# sourceMappingURL=cli.d.ts.map\n');
      fs.writeFileSync(path.join(d, 'cli.d.ts.map'), '{}');
      fs.writeFileSync(path.join(d, 'clean.js'), 'b();\n');
      assert.deepEqual(stripMaps(d), { maps: 2, comments: 2 });
      assert.deepEqual(fs.readdirSync(d, { recursive: true }).map(String).sort(), ['clean.js', 'cli.d.ts', 'web', path.join('web', 'assets'), path.join('web', 'assets', 'a.js')]);
      assert.equal(fs.readFileSync(path.join(d, 'web', 'assets', 'a.js'), 'utf8'), 'a();\n');
      assert.deepEqual(stripMaps(d), { maps: 0, comments: 0 }, 'a second run finds nothing');
    } finally {
      rmTmp(d);
    }
  });
});

describe('the package', () => {
  test('ships dist/ and the docs, and builds before packing', () => {
    assert.deepEqual(pkg.files, ['dist/server/', 'dist/shared/', 'dist/web/', 'dist/build-info.json', 'AGENT-GUIDE.md', 'CHANGELOG.md']);
    assert.equal(pkg.scripts.prepack, 'npm run build');
    assert.match(pkg.scripts.build, /strip-maps\.mjs.*build-info\.mjs$/, 'build strips maps, then writes build-info.json last');
    assert.deepEqual(pkg.publishConfig, { access: 'public', provenance: true });
  });

  test('changesets version against next, publicly, with GitHub links', () => {
    const config = JSON.parse(read('.changeset/config.json'));
    assert.equal(config.baseBranch, 'next');
    assert.equal(config.access, 'public');
    assert.deepEqual(config.changelog, ['@changesets/changelog-github', { repo: 'edspencer/bragdoc-ai' }]);
  });
});

describe('the release workflow', () => {
  const wf = YAML.parse(read('.github/workflows/release.yml'));
  const jobs = wf.jobs as Record<string, { needs?: string[] | string; if?: string; steps: { name?: string; run?: string; if?: string; uses?: string }[] }>;
  const needs = (j: string) => [jobs[j].needs ?? []].flat();

  test('runs only by hand (dry run by default), or as a dry run on a PR that changes it', () => {
    assert.deepEqual(Object.keys(wf.on).sort(), ['pull_request', 'workflow_dispatch']);
    assert.equal(wf.on.workflow_dispatch.inputs['dry-run'].default, true);
    assert.deepEqual(wf.on.workflow_dispatch.inputs['dist-tag'].options, ['next', 'latest']);
    assert.deepEqual(wf.on.pull_request.paths, ['.github/workflows/release.yml']);
  });

  test('npm publishes last: after CI on the commit, the smoke-tested tarball and the image', () => {
    assert.deepEqual(needs('publish-npm').sort(), ['pack', 'publish-image', 'release', 'verify-ci']);
    assert.deepEqual(needs('publish-image').sort(), ['build-image', 'pack', 'release']);
    assert.ok(needs('build-image').includes('verify-ci'));
    assert.ok(needs('pack').includes('verify-ci'));
    assert.deepEqual(needs('github-release').sort(), ['publish-npm', 'release']);
  });

  test('every step that writes anywhere is skipped in a dry run', () => {
    const writes = (s: { name?: string; uses?: string }) =>
      /^(docker\/login-action|actions\/attest|anchore\/sbom-action|changesets\/action)/.test(s.uses ?? '') ||
      ['Push by digest', 'Upload digest', 'Tag the multi-arch image'].includes(s.name ?? '');
    let gated = 0;
    // github-release is skipped as a whole in a dry run (below)
    for (const [name, job] of Object.entries(jobs))
      if (name !== 'github-release')
        for (const step of job.steps.filter(writes)) {
          assert.match(step.if ?? '', /(dry_run|DRY_RUN) == 'false'/, `${name}: ${step.name ?? step.uses} runs in a dry run`);
          gated++;
        }
    assert.ok(gated >= 9, `found the writing steps (${gated})`);
    assert.match(jobs['github-release'].if ?? '', /dry_run == 'false'/, 'no GitHub Release in a dry run');
    const publish = jobs['publish-npm'].steps.find((s) => s.name === 'Publish')?.run ?? '';
    assert.match(publish, /if \[ "\$\{DRY_RUN\}" = "true" \]; then\n\s+npm publish "\$\{tarball\}" [^\n]*--dry-run/, 'a dry run publishes with --dry-run');
  });
});

describe('Docker', () => {
  test('the image: node:22-slim, tini, a non-root user, /data, a health check', () => {
    const df = read('Dockerfile');
    assert.match(df, /^FROM node:22-slim AS runtime$/m);
    assert.match(df, /^ENTRYPOINT \["\/usr\/bin\/tini", "--"\]$/m);
    assert.match(df, /^USER node$/m);
    assert.match(df, /BRAGDOC_HOME=\/data/);
    assert.match(df, /BRAGDOC_DANGEROUSLY_ALLOW_OPEN=1/);
    assert.match(df, /^VOLUME \["\/data"\]$/m);
    assert.match(df, /^HEALTHCHECK .*\n.*\/api\/health/m);
    assert.match(df, /npm ci --omit=dev/);
  });

  test('compose publishes on loopback only, and shares ~/.bragdoc', () => {
    const compose = YAML.parse(read('compose.yaml'));
    const svc = compose.services.bragdoc;
    assert.deepEqual(svc.ports, ['127.0.0.1:2724:2724']);
    const data = svc.volumes.find((v: { target: string }) => v.target === '/data');
    assert.equal(data.source, '${HOME}/.bragdoc');
    for (const v of svc.volumes.filter((v: { target: string }) => v.target !== '/data')) assert.equal(v.read_only, true, `${v.target} is read-only`);
  });
});
