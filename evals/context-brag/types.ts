import { type Brag } from "../../lib/db/schema";

import { type CompanyContext, type ProjectContext } from '../conversation-gen/types';

export type ContextBragExample = {
  input: { 
    input: string
    chat_history: { role: string; content: string }[]
    context: {
      companies: CompanyContext[]
      projects: ProjectContext[]
    }
  }
  expected: {
    brag: Brag
    companyId: string | null
    projectId: string | null
    suggestNewProject?: boolean
  }
};
