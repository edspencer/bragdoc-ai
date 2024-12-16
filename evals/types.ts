export interface ChatTurn {
  role: 'user' | 'assistant';
  content: string;
}

export interface Brag {
  title: string;
  summary: string;
  details: string;
  eventStart: Date;
  eventEnd: Date;
  eventDuration: 'day' | 'week' | 'month' | 'quarter' | 'half year' | 'year';
  companyId: string | null;
  projectId: string | null;
}

export interface Conversation {
  description: string;
  input: string;
  chat_history: ChatTurn[];
  expected: {
    brag: Brag;
    response: string;
  };
}
