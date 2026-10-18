// `node --import ./register.mjs`: puts hook.mjs in front of every module resolution in this process.
import { register } from 'node:module';

register('./hook.mjs', import.meta.url);
