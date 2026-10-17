// The operations HTTP routes and MCP tools both call (D24). Each validates its input (shared/schema/inputs.ts), writes
// through the store, and updates the index before it returns. Errors are the store's (server/store/errors.ts):
// NotFoundError, ValidationError, ConflictError, ReadOnlyError. Reads are synchronous; the few calls that store files
// (evidence ingest, Found keep and merge) are async.
import type { Store } from '../store/index.js';
import { AchievementService } from './achievements.js';
import { CompanyService, ProjectService, RepoService } from './catalog.js';
import { EvidenceService } from './evidence.js';
import { FoundService } from './found.js';
import { ProfileService } from './profile.js';

export interface Services {
  achievements: AchievementService;
  projects: ProjectService;
  companies: CompanyService;
  repos: RepoService;
  evidence: EvidenceService;
  found: FoundService;
  profile: ProfileService;
}

export function createServices(store: Store): Services {
  const achievements = new AchievementService(store);
  const evidence = new EvidenceService(store);
  return {
    achievements,
    projects: new ProjectService(store),
    companies: new CompanyService(store),
    repos: new RepoService(store),
    evidence,
    found: new FoundService(store, achievements, evidence),
    profile: new ProfileService(store),
  };
}

export type { AchievementService, ListResult } from './achievements.js';
export type { CompanyService, ProjectService, RepoService } from './catalog.js';
export { ATTACHABLE, type EvidenceService } from './evidence.js';
export type { AddResult, DecideResult, FoundService } from './found.js';
export type { ProfileService } from './profile.js';
