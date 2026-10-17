// `npm run sync:reference`: rewrite the generated file-format reference in docs/data-format.md from the schemas
// (shared/schema/reference.ts; Hallway's sync-guide). test/schema.test.ts fails until it's run after a schema change.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { withReference } from '../shared/schema/reference.ts';

const file = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'docs', 'data-format.md');
const before = fs.readFileSync(file, 'utf8');
const after = withReference(before);
if (after === before) console.log('docs/data-format.md is up to date');
else {
  fs.writeFileSync(file, after);
  console.log('docs/data-format.md: reference updated');
}
