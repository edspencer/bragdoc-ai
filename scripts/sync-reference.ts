// `npm run sync:reference`: rewrite the generated file-format reference in docs/data-format.md and AGENT-GUIDE.md from
// the schemas (shared/schema/reference.ts; Hallway's sync-guide). test/schema.test.ts and test/guide.test.ts fail until
// it's run after a schema change. (The server regenerates the guide's copy whenever it renders it anyway; this keeps
// the committed copies, which GitHub and the npm page show, in step.)
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { withReference } from '../shared/schema/reference.ts';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
for (const rel of ['docs/data-format.md', 'AGENT-GUIDE.md']) {
  const file = path.join(root, rel);
  const before = fs.readFileSync(file, 'utf8');
  const after = withReference(before);
  if (after === before) console.log(`${rel} is up to date`);
  else {
    fs.writeFileSync(file, after);
    console.log(`${rel}: reference updated`);
  }
}
