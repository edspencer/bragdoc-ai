// The last step of `npm run build`: write dist/server/schema-versions.json, the format version of each kind of file this
// build writes (D23), config.yaml's included. `bragdoc update` reads the NEW version's copy, once it's installed and
// before it starts, and backs your data up first if any of them went up (cli-contract SPEC §5 step 14, D88). It's read
// from the built code, so it can't drift from it.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

/** `{ profile: 1, …, config: 1 }`, from a build's dist/. */
export async function schemaVersionsFrom(dist) {
  const { SCHEMA_VERSIONS } = await import(pathToFileURL(path.join(dist, 'shared', 'schema', 'common.js')).href);
  const { CONFIG_SCHEMA_VERSION } = await import(pathToFileURL(path.join(dist, 'server', 'config.js')).href);
  return { ...SCHEMA_VERSIONS, config: CONFIG_SCHEMA_VERSION };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const dist = path.join(root, 'dist');
  const versions = await schemaVersionsFrom(dist);
  fs.writeFileSync(path.join(dist, 'server', 'schema-versions.json'), JSON.stringify(versions, null, 2) + '\n');
  console.log(`schema-versions: ${Object.entries(versions).map(([k, v]) => `${k} ${v}`).join(', ')}`);
}
