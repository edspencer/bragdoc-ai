import type { Achievement } from "../../lib/types/achievement";

import type { CompanyContext, ProjectContext } from '../conversation-gen/types';

export type ContextAchievementExample = {
  input: { 
    input: string
    chat_history: { role: string; content: string }[]
    context: {
      companies: CompanyContext[]
      projects: ProjectContext[]
    }
  }
  expected: {
    achievement: Achievement
    companyId: string | null
    projectId: string | null
    suggestNewProject?: boolean
  }
};
