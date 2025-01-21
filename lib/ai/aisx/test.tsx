import { addYears } from 'date-fns';
import React, { createElement } from 'react';
import type { Company, Project } from '@/lib/db/schema';
import { Companies, Projects } from '../prompts/elements';
import { formattedRender } from 'jsx-prompt';

const userId = 'b4b0c5cb-0e33-4f67-95c9-8f7c0b9a9bcb';

// Test data
const companies: Company[] = [
  {
    id: '1c0c5cb0-0e33-4f67-95c9-8f7c0b9a9bcb',
    name: 'Codeium',
    role: 'AI Engineer',
    domain: null,
    startDate: addYears(new Date(), -7),
    endDate: addYears(new Date(), -3),
    userId,
  },
  {
    id: 'd4b0c5cb-0e33-4f67-95c9-8f7c0b9a9bcb',
    name: 'Google',
    role: 'Software Engineer',
    domain: null,
    startDate: addYears(new Date(), -3),
    endDate: addYears(new Date(), -1),
    userId,
  },
  {
    id: 'd6b0c5cb-0e33-4f67-95c9-8f7c0b9a9bcb',
    name: 'Meta',
    role: 'Senior Developer',
    domain: null,
    startDate: addYears(new Date(), -1),
    endDate: null,
    userId,
  },
];

const projects: Project[] = [
  {
    id: '1c0c5cb0-0e33-4f67-95c9-8f7c0b9a9bcb',
    name: 'Project A',
    description: 'Description of Project A',
    startDate: new Date(),
    endDate: new Date(),
    userId,
    companyId: '1c0c5cb0-0e33-4f67-95c9-8f7c0b9a9bcb',
    status: 'active',
    createdAt: new Date(),
    updatedAt: new Date(),
    repoRemoteUrl: null,
  },
  {
    id: 'd4b0c5cb-0e33-4f67-95c9-8f7c0b9a9bcb',
    name: 'Project B',
    description: 'Description of Project B',
    startDate: new Date(),
    endDate: new Date(),
    userId,
    companyId: 'd4b0c5cb-0e33-4f67-95c9-8f7c0b9a9bcb',
    status: 'active',
    createdAt: new Date(),
    updatedAt: new Date(),
    repoRemoteUrl: null,
  },
  {
    id: 'd6b0c5cb-0e33-4f67-95c9-8f7c0b9a9bcb',
    name: 'Project C',
    description: 'Description of Project C',
    startDate: new Date(),
    endDate: new Date(),
    userId,
    companyId: 'd6b0c5cb-0e33-4f67-95c9-8f7c0b9a9bcb',
    status: 'active',
    createdAt: new Date(),
    updatedAt: new Date(),
    repoRemoteUrl: null,
  },
];

const Prompt = () => {
  return (
    <>
      Please do something cool:
      <Companies companies={companies} />
      <Projects projects={projects} />
    </>
  );
};

// Render the component to string
const output = formattedRender(createElement(Prompt));

// Output the formatted result
console.log(output);
