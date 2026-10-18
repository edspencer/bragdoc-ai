// `npm run sync:reference`: rewrite the generated file-format reference in docs/data-format.md, AGENT-GUIDE.md and its
// copy on the docs site's data-folder page, from the schemas (shared/schema/reference.ts; Hallway's sync-guide).
// test/schema.test.ts, test/guide.test.ts and test/docs.test.ts fail until it's run after a schema change. (The server
// regenerates the guide's copy whenever it renders it anyway; this keeps the committed copies in step.)
//
// It also rewrites the docs site's AI tables (scripts/ai-reference.ts, PR29): the recommended models, what the judge
// measured, and each cloud provider's consent statement, in every docs page that has an ai-reference block.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { withReference } from '../shared/schema/reference.ts';
import { aiReferenceBlocks, withAiReference } from './ai-reference.ts';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
for (const rel of ['docs/data-format.md', 'AGENT-GUIDE.md', 'website/src/content/docs/reference/data-folder.md']) {
  const file = path.join(ROOT, rel);
  const before = fs.readFileSync(file, 'utf8');
  const after = withReference(before);
  if (after === before) console.log(`${rel} is up to date`);
  else {
    fs.writeFileSync(file, after);
    console.log(`${rel}: reference updated`);
  }
}
const DOCS = path.join(ROOT, 'website', 'src', 'content', 'docs');
for (const e of fs.readdirSync(DOCS, { recursive: true, withFileTypes: true })) {
  if (!e.isFile() || !/\.mdx?$/.test(e.name)) continue;
  const file = path.join(e.parentPath, e.name);
  const before = fs.readFileSync(file, 'utf8');
  if (!aiReferenceBlocks(before).length) continue;
  const after = withAiReference(before);
  const rel = path.relative(ROOT, file);
  if (after === before) console.log(`${rel} is up to date`);
  else {
    fs.writeFileSync(file, after);
    console.log(`${rel}: AI reference updated`);
  }
}
