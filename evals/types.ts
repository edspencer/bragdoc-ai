export interface ChatTurn {
  role: 'user' | 'assistant';
  content: string;
}

export interface Achievement {
  title: string;
  summary: string;
  details: string;
  eventStart: Date | null;
  eventEnd: Date | null;
  eventDuration: 'day' | 'week' | 'month' | 'quarter' | 'half year' | 'year';
  companyId: string | null;
  projectId: string | null;
}

export interface Conversation {
  description: string;
  input: string;
  chat_history: ChatTurn[];
  expected: {
    achievement: Achievement;
    response: string;
  };
}
