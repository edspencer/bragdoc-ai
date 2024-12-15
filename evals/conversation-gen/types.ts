import { type Brag } from "../../lib/db/schema";

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

export type GeneratedTestData = {
  scenario: ConversationScenario;
  conversation: Conversation;
  expectedBrags: Brag[];
};
