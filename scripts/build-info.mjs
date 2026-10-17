// `npm run build:info` (the last step of `npm run build`): write dist/build-info.json, what this build says about
// itself. GET /api/meta serves it, and About → Verify this build (PR10) shows it next to the commands that check it
// independently (SPEC R14). It's a claim, not a proof: anyone can write this file, so the app never shows a build as
// "verified"; `npm audit signatures` and `gh attestation verify` are the proof.
//
// - version: package.json's.
// - commit: $GITHUB_SHA in Actions, else `git rev-parse HEAD` if this is a checkout, else null (a Docker build context
//   has no .git; the Dockerfile passes GITHUB_SHA in as a build arg).
// - builtAt: from $SOURCE_DATE_EPOCH when set (the release workflow sets it to the commit's time, so two builds of one
//   commit say the same thing), else now.
// - runUrl: the Actions run that built it, or null.
// - official: true only when the release workflow built it (it sets BRAGDOC_OFFICIAL_BUILD=1 and there's a run URL).
//   Everything else, including CI and `npm pack` on a laptop, is an "unofficial build".
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
const env = process.env;

function gitCommit() {
  try {
    return execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim() || null;
  } catch {
    return null; // no git, or not a checkout
  }
}

function builtAt() {
  const epoch = env.SOURCE_DATE_EPOCH;
  if (epoch === undefined || epoch === '') return new Date().toISOString();
  if (!/^\d+$/.test(epoch)) throw new Error(`SOURCE_DATE_EPOCH must be whole seconds since 1970, not '${epoch}'`);
  return new Date(Number(epoch) * 1000).toISOString();
}

const actions = env.GITHUB_ACTIONS === 'true';
const runUrl =
  env.BRAGDOC_BUILD_RUN_URL ||
  (actions && env.GITHUB_SERVER_URL && env.GITHUB_REPOSITORY && env.GITHUB_RUN_ID
    ? `${env.GITHUB_SERVER_URL}/${env.GITHUB_REPOSITORY}/actions/runs/${env.GITHUB_RUN_ID}${env.GITHUB_RUN_ATTEMPT ? `/attempts/${env.GITHUB_RUN_ATTEMPT}` : ''}`
    : null);

const info = {
  name: pkg.name,
  version: pkg.version,
  commit: env.GITHUB_SHA || gitCommit(),
  builtAt: builtAt(),
  runUrl,
  // An official build always names the run that made it. The Docker build runs inside BuildKit, outside Actions'
  // environment, so the workflow passes the run URL in as a build arg and the image claims the same as the package.
  official: env.BRAGDOC_OFFICIAL_BUILD === '1' && runUrl !== null,
};

fs.mkdirSync(path.join(root, 'dist'), { recursive: true });
fs.writeFileSync(path.join(root, 'dist', 'build-info.json'), JSON.stringify(info, null, 2) + '\n');
console.log(`build-info: ${info.name}@${info.version} ${info.commit?.slice(0, 12) ?? '(no commit)'} ${info.official ? 'official' : 'unofficial'} build`);
