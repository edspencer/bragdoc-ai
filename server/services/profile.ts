// profile.yaml: get and set. Its absence means first run (onboarding, PR16).
import { ProfileUpdateSchema, type Profile } from '../../shared/schema/index.js';
import { ValidationError, type Store, type WriteOptions } from '../store/index.js';
import { defined, validate } from './util.js';

export class ProfileService {
  constructor(private store: Store) {}

  /** The profile, or null before onboarding. */
  get(): Profile | null {
    return this.store.profile();
  }

  /** Change the profile (`null` clears a field), creating it on first use, when `name` is required. */
  set(input: unknown, opts: Pick<WriteOptions, 'ifMatch'> = {}): Profile {
    const v = validate(ProfileUpdateSchema, input);
    return this.store.write(
      'profile',
      'profile',
      (cur) => {
        if (!cur && !v.name) throw new ValidationError('name: say what to call you', [{ key: 'name', message: 'required' }]);
        return { patch: defined(v) };
      },
      opts,
    );
  }
}
