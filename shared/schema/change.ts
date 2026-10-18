// What the store announces when a file changes, whether BragDoc wrote it or something else did (a hand edit, `git
// pull`, an agent). The server forwards these to the browser over SSE (PR2's event stream, wired up in PR7).

export type ChangeEntity = 'profile' | 'company' | 'project' | 'repo' | 'achievement' | 'evidence' | 'found' | 'instructions';

export interface StoreChange {
  entity: ChangeEntity;
  /** The entity's id; the blob's sha256 for `evidence`; `profile` for the profile; the name for `instructions`. */
  id: string;
  /** `upsert`: created, changed, or now broken (see `problem`); `remove`: gone. */
  op: 'upsert' | 'remove';
  /** True when the file is now broken (it keeps its last good copy, if any). */
  problem?: boolean;
}
