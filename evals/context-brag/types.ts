import type { ExtractedAchievement, ChatMessage } from '../../lib/ai/extract';

import type { CompanyContext, ProjectContext } from '../conversation-gen/types';

export type ContextAchievementExample = {
  input: {
    input: string;
    chat_history: ChatMessage[];
    context: {
      companies: CompanyContext[];
      projects: ProjectContext[];
    };
  };
  expected: ExtractedAchievement[];
};
