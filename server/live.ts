// The store's changes, onto the event bus (D39). The store announces every change to a data file, whether BragDoc
// wrote it (a route, an MCP tool) or something else did (a hand edit, `git pull`, an agent editing the file), as a
// StoreChange; here each becomes a ServerEvent named after its entity (`{ type: 'achievement' }`), plus
// `{ type: 'problems' }`, since any change can fix or break a file. The web app refetches whatever depends on that
// type (src/api/events.ts CHANGE_INVALIDATES).
//
// Events are hints, never data, so a burst (a `git pull` touching 200 files, an import) is debounced per type into one
// push: the last change of a type wins, and they're all the same.
import type { ServerEvent } from '../shared/api.js';
import type { ChangeEntity } from '../shared/schema/index.js';
import type { EventBus } from './events.js';
import type { Store } from './store/index.js';

const TYPE: Record<ChangeEntity, ServerEvent['type']> = {
  achievement: 'achievement',
  evidence: 'evidence',
  project: 'project',
  repo: 'repo',
  company: 'company',
  found: 'found',
  profile: 'profile',
};

/** Forward every store change to the bus. Returns the unsubscribe function. */
export function forwardStoreChanges(store: Store, bus: EventBus): () => void {
  return store.subscribe((c) => {
    const type = TYPE[c.entity];
    if (!type) return;
    bus.emitSoon(`store:${type}`, { type } as ServerEvent);
    bus.emitSoon('store:problems', { type: 'problems' });
  });
}
