import type { User } from '@/database/schema';
import { v4 as uuidv4 } from 'uuid';

export const user: User = {
  name: 'Ed Spencer',
  preferences: {
    documentInstructions: `If I don't mention a specific project, I'm talking about Brag Doc.`,
    language: 'en',
    hasSeenWelcome: true,
  },
  id: uuidv4(),
  email: 'Q3Sd2@example.com',
} as User;

export const previousCompany = {
  name: 'Palo Alto Networks',
  id: uuidv4(),
  startDate: new Date('2016-02-01'),
  endDate: new Date('2021-09-30'),
  userId: user.id,
  role: 'Principal Engineer',
  domain: 'www.paloaltonetworks.com',
};

export const company = {
  name: 'Egghead Research',
  id: uuidv4(),
  startDate: new Date('2023-01-01'),
  endDate: null,
  userId: user.id,
  role: 'Chief Scientist',
  domain: 'www.edspencer.net',
};

export const project1 = {
  name: 'BragDoc.ai',
  description: 'AI-powered self-advocacy tool for tech-savvy individuals.',
  startDate: new Date('2024-12-15'),
  endDate: null,
  id: uuidv4(),
  companyId: company.id,
  status: 'active',
  color: '#3B82F6',
  createdAt: new Date('2023-01-01'),
  updatedAt: new Date('2023-01-01'),
  userId: user.id,
  repoRemoteUrl: null,
};

export const project2 = {
  name: 'mdx-prompt',
  description: 'Composable LLM prompts with JSX and MDX',
  startDate: new Date('2024-01-05'),
  endDate: null,
  id: uuidv4(),
  companyId: company.id,
  status: 'active',
  color: '#10B981',
  createdAt: new Date('2023-01-01'),
  updatedAt: new Date('2023-01-01'),
  userId: user.id,
  repoRemoteUrl: null,
};

export const projects = [project1, project2];
export const companies = [company, previousCompany];

export const repository = {
  name: 'bragdoc-ai',
  path: '/path/to/bragdoc-ai',
  remoteUrl: 'https://github.com/edspencer/bragdoc-ai',
};

export const commits = [
  {
    message:
      'Wrote a bunch of new Evals for extracting achievements and generating documents',
    hash: '1234',
    author: {
      name: 'John Doe',
      email: 'john@doe.com',
    },
    date: '2023-01-01',
  },
  {
    message: 'Better styling for the blog pages',
    hash: '5678',
    author: {
      name: 'John Doe',
      email: 'john@doe.com',
    },
    date: '2023-01-02',
  },
];
