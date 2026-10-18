// An ImportReport as `bragdoc import` prints it: the counts as a table, what was left behind and why, and the problems
// (the first few in full, then how many more).
import type { ImportKind, ImportReport } from '../../shared/api.js';

const ROWS: [ImportKind, string][] = [
  ['companies', 'companies'],
  ['projects', 'projects'],
  ['repos', 'repos'],
  ['achievements', 'achievements'],
  ['documents', 'documents'],
  ['reviews', 'performance reviews'],
];

/** How many problems are printed in full. */
export const SHOWN_PROBLEMS = 20;

const plural = (n: number, one: string, many = one + 's') => `${n} ${n === 1 ? one : many}`;

export function formatReport(r: ImportReport, { file }: { file?: string } = {}): string {
  const out: string[] = [];
  out.push(`${r.dryRun ? 'Dry run of importing' : 'Imported'} ${file ?? 'a hosted BragDoc export'}${r.exportedAt ? ` (exported ${r.exportedAt.slice(0, 10)})` : ''}.`);
  out.push('');
  const w = Math.max(...ROWS.map(([, l]) => l.length));
  out.push(`  ${''.padEnd(w)}  ${r.dryRun ? 'would add' : '    added'}  already here  not imported`);
  for (const [k, label] of ROWS) {
    const c = r.counts[k];
    out.push(`  ${label.padEnd(w)}  ${String(c.add).padStart(9)}  ${String(c.skip).padStart(12)}  ${String(c.fail).padStart(12)}`);
  }
  if (r.dropped.length) {
    out.push('', 'Left behind (BragDoc has no place for these):');
    for (const d of r.dropped) out.push(`  ${d.field} (${plural(d.count, 'item')}): ${d.why}.`);
  }
  if (r.problems.length) {
    const errors = r.problems.filter((p) => p.level === 'error').length;
    const warnings = r.problems.length - errors;
    out.push('', `Problems: ${[errors && `${errors} not imported`, warnings && `${warnings} ${r.dryRun ? 'to be imported' : 'imported'} with a change`].filter(Boolean).join(', ')}.`);
    for (const p of r.problems.slice(0, SHOWN_PROBLEMS)) out.push(`  ${p.level === 'error' ? 'error  ' : 'warning'}  ${p.item}: ${p.message}`);
    if (r.problems.length > SHOWN_PROBLEMS) out.push(`  … and ${r.problems.length - SHOWN_PROBLEMS} more.`);
  }
  out.push('');
  const total = (f: 'add' | 'skip') => ROWS.reduce((n, [k]) => n + r.counts[k][f], 0);
  if (r.importsDir) out.push(`Documents and reviews ${r.dryRun ? 'would go' : 'went'} to ${r.importsDir}/ in your data folder, as read-only markdown.`);
  if (r.dryRun) {
    if (total('add') === 0) out.push(total('skip') ? 'Everything in it is already here: importing it would add nothing.' : 'There is nothing in it to import.');
    else out.push('Nothing has been written. Run it again without --dry-run to import.');
  } else {
    if (r.snapshot) out.push(`A copy of your data from just before the import is in ${r.snapshot}/.`);
    if (total('add') === 0) out.push(total('skip') ? 'Everything in it was already here, so nothing was added.' : 'There was nothing in it to import.');
    else out.push('Importing the same file again is safe: anything already here is skipped.');
  }
  return out.join('\n') + '\n';
}
