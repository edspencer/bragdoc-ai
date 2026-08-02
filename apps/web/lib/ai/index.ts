/**
 * BYOK model resolution entry point.
 *
 * The pre-BYOK module-level model singletons (`routerModel`, `chatModel`,
 * `documentWritingModel`, `extractAchievementsModel`, `getLLM`, ...) were
 * deliberately removed: every AI call site must resolve its model per-user
 * via `resolveModelForUser` so non-demo users always run on their own key.
 */

export {
  type LLMTask,
  NO_LLM_CONFIGURED_ERROR,
  NoLLMConfigError,
  noLLMConfigResponse,
  resolveModelForUser,
} from './resolve-model';
