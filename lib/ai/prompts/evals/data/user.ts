import type { User } from '@/lib/db/schema';
import { v4 as uuidv4 } from 'uuid';

export const previousCompany = {
  name: 'Palo Alto Networks',
  id: uuidv4(),
  startDate: new Date('2016-02-01'),
  endDate: new Date('2021-09-30'),
  userId: uuidv4(),
  role: 'Principal Engineer',
  domain: 'www.paloaltonetworks.com',
};

export const company = {
  name: 'Egghead Research',
  id: uuidv4(),
  startDate: new Date('2023-01-01'),
  endDate: null,
  userId: uuidv4(),
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
  createdAt: new Date('2023-01-01'),
  updatedAt: new Date('2023-01-01'),
  userId: company.userId,
  repoRemoteUrl: null
}

export const project2 = {
  name: 'Project Y',
  description: 'Description of Project Y',
  startDate: new Date('2023-01-01'),
  endDate: new Date('2023-06-30'),
  id: uuidv4(),
  companyId: company.id,
  status: 'active',
  createdAt: new Date('2023-01-01'),
  updatedAt: new Date('2023-01-01'),
  userId: company.userId,
  repoRemoteUrl: null
}

export const projects = [project1, project2];
export const companies = [company, previousCompany];

export const user: User = {
  name: 'Ed Spencer',
  preferences: {
    documentInstructions: `If I don't mention a specific project, I'm talking about Brag Doc.`,
    language: 'en',
    hasSeenWelcome: true
  },
  id: uuidv4(),
  email: 'Q3Sd2@example.com',
} as User;

export const repository = {
  name: 'bragdoc-ai',
  path: '/path/to/bragdoc-ai',
  remoteUrl: 'https://github.com/edspencer/bragdoc-ai',
}

export const commits = [
  {
    message:
      "Wrote a bunch of new Evals for extracting achievements and generating documents",
    hash: '1234',
    author: {
      name: 'John Doe',
      email: 'john@doe.com',
    },
    date: '2023-01-01',
  },
  {
    message: "Better styling for the blog pages",
    hash: '5678',
    author: {
      name: 'John Doe',
      email: 'john@doe.com',
    },
    date: '2023-01-02',
  },
]