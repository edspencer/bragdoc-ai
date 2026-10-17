// `npm run sync:reference`: rewrite the generated file-format reference in docs/data-format.md, and its copy on the
// docs site's data-folder page, from the schemas (shared/schema/reference.ts; Hallway's sync-guide).
// test/schema.test.ts and test/docs.test.ts fail until it's run after a schema change.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { withReference } from '../shared/schema/reference.ts';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
for (const rel of ['docs/data-format.md', 'website/src/content/docs/reference/data-folder.md']) {
  const file = path.join(ROOT, rel);
  const before = fs.readFileSync(file, 'utf8');
  const after = withReference(before);
  if (after === before) console.log(`${rel} is up to date`);
  else {
    fs.writeFileSync(file, after);
    console.log(`${rel}: reference updated`);
  }
}
