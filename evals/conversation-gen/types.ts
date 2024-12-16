

export type CompanyContext = {
  id: string;
  name: string;
  role: string;
  domain?: string;
  startDate: Date;
  endDate?: Date;
};

export type ProjectContext = {
  id: string;
  name: string;
  companyId?: string;
  description: string;
  startDate?: Date;
  endDate?: Date;
};

export type ConversationScenario = {
  description: string;
  companies: CompanyContext[];
  projects: ProjectContext[];
  userPersona: string;
  userId: string;
  timeframe: {
    start: Date;
    end: Date;
  };
};

export type Message = {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
};

export type Conversation = {
  id: string;
  messages: Message[];
  scenario: ConversationScenario;
};

export type GeneratedBrag = {
  id: string;
  userId: string;
  userMessageId: string;
  title: string; 
  summary: string;
  details: string;
  eventStart: Date;
  eventEnd: Date;
  eventDuration: string;
  companyId: string | null;
  projectId: string | null;
  isArchived: boolean;
  createdAt: Date;
  updatedAt: Date;
  suggestNewProject?: boolean;
};

export type GeneratedTestData = {
  scenario: ConversationScenario;
  conversation: Conversation;
  expectedBrags: GeneratedBrag[];
};
