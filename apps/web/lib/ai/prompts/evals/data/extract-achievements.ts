import type { LLMExtractedAchievement } from '../../types';
import { user, project1, project2, company, previousCompany } from './user';
import { v4 as uuidv4 } from 'uuid';

export const chatHistory: any[] = [];

export const expectedAchievements: LLMExtractedAchievement[] = [
  {
    eventStart: '2024-06-15',
    eventEnd: '2024-09-15',
    eventDuration: 'quarter',
    title: 'Launched AI Analysis Tool with 95% Accuracy at Quantum Nexus',
    summary:
      "Developed an AI tool for real-time data analysis with 95% accuracy for Quantum Nexus, playing a pivotal role in Project Orion's success.",
    details:
      "As part of Project Orion at Quantum Nexus, I was responsible for developing a cutting-edge AI tool focused on real-time data analysis. By implementing advanced algorithms and enhancing the training data sets, the tool reached a 95% accuracy rate. This result significantly supported the company's research objectives and has been positively acknowledged by stakeholders for its robust performance and reliability.",
    companyId: 'e3856e75-37cf-4640-afd9-e73a53fa967d',
    projectId: '3923129e-719b-4f99-8487-9830cf64ad5d',
    impact: 6,
  },
  {
    eventStart: '2024-08-01',
    eventEnd: '2024-11-30',
    eventDuration: 'quarter',
    title: 'Implemented Scalable Quantum Infrastructure at Quantum Nexus',
    summary:
      'Built a scalable quantum computing infrastructure for Quantum Nexus, boosting computational efficiency by 200% over 4 months.',
    details:
      'During my work on Quantum Leap, I led the design and development of a new scalable infrastructure for quantum computing simulations at Quantum Nexus. This involved optimizing resource allocation and network latency reduction strategies. As a result, the computational efficiency increased by 200%, enhancing the simulation capabilities and supporting cutting-edge research.',
    companyId: 'e3856e75-37cf-4640-afd9-e73a53fa967d',
    projectId: '84451830-87ea-4453-b341-40600c1febe0',
    impact: 6,
  },
  {
    eventStart: '2023-12-01',
    eventEnd: '2024-05-10',
    eventDuration: 'half year',
    title: 'Developed Innovation Platform with 99% Uptime at InnovateHub',
    summary:
      'Created an innovation management platform with 99% uptime for InnovateHub, significantly enhancing operational functionality over 5 months.',
    details:
      'At InnovateHub, I contributed to the Innovation Pathway project by engineering a new platform for innovation management. Focusing on architecture stability and high availability, I ensured that the system maintained a 99% uptime. This platform empowered users with better management tools and contributed to fostering a more innovative work environment.',
    companyId: 'b1811fbb-5768-4cb8-9faf-66d0fab08f36',
    projectId: '55526e8d-3b6b-4a9b-8ba6-3f3a3681d894',
    impact: 6,
  },
];

export type Experiment = {
  input: any;
  expected: any;
};

export const experimentData: Experiment[] = [
  {
    expected: expectedAchievements,
    input: {
      user,

      //assuming the document was generated via chat UI
      chatHistory,

      //if the user was clearly talking about a specific project,
      //this will be provided now
      projects: [project1, project2],

      //if there is a project, and the project has a company,
      //this will be provided now
      companies: [company, previousCompany],

      achievements: [
        //any achievements that were found for the request

        {
          id: uuidv4(),
          title: 'Implemented feature',
          summary: 'Implemented feature X on project X',
          impact: 9,
          eventDuration: 'day',
          eventStart: new Date('2023-02-01'),
        },
        {
          id: uuidv4(),
          title: 'Debugged bug',
          summary: 'Found and fixed a login-related bug on project X',
          impact: 6,
          eventDuration: 'day',
          eventStart: new Date('2023-02-02'),
        },
        {
          id: uuidv4(),
          title: 'Tested feature',
          summary: 'Tested feature X on project X',
          impact: 9,
          eventDuration: 'day',
          eventStart: new Date('2023-02-03'),
        },
        {
          id: uuidv4(),
          title: 'Refactored code',
          summary: 'Refactored a section of the codebase for project X',
          impact: 9,
          eventDuration: 'day',
          eventStart: new Date('2023-02-04'),
        },
        {
          id: uuidv4(),
          title: 'Documented code',
          summary: 'Wrote unit tests for feature X on project X',
          impact: 9,
          eventDuration: 'day',
          eventStart: new Date('2023-02-05'),
        },
        {
          id: uuidv4(),
          title: 'Researched',
          summary:
            'Spent a few hours researching options for feature Y on project X',
          impact: 9,
          eventDuration: 'day',
          eventStart: new Date('2023-02-06'),
        },
      ],
    },
  },
];
