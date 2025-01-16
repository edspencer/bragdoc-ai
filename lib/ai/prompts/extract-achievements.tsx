import {
  Prompt,
  Purpose,
  Instructions,
  Examples,
  InputFormat,
  UserInput,
  ChatHistory,
  Variables,
} from '../aisx';
import { Companies, Projects } from '../aisx/elements';
import { Company, Project, Achievement } from '@/lib/db/schema';

export type ExtractedAchievement = Pick<
  Achievement,
  | 'title'
  | 'summary'
  | 'details'
  | 'eventDuration'
  | 'eventStart'
  | 'eventEnd'
  | 'companyId'
  | 'projectId'
  | 'impact'
>;

const examples: ExtractedAchievement[] = [
  {
    eventStart: new Date('2024-06-15T09:00:00.000Z'),
    eventEnd: new Date('2024-09-15T17:00:00.000Z'),
    eventDuration: 'quarter',
    title: 'Launched AI Analysis Tool with 95% Accuracy at Quantum Nexus',
    summary:
      "Developed an AI tool for real-time data analysis with 95% accuracy for Quantum Nexus, playing a pivotal role in Project Orion's success.",
    details:
      "As part of Project Orion at Quantum Nexus, I was responsible for developing a cutting-edge AI tool focused on real-time data analysis. By implementing advanced algorithms and enhancing the training data sets, the tool reached a 95% accuracy rate. This result significantly supported the company's research objectives and has been positively acknowledged by stakeholders for its robust performance and reliability.",
    companyId: 'e3856e75-37cf-4640-afd9-e73a53fa967d',
    projectId: '3923129e-719b-4f99-8487-9830cf64ad5d',
    impact: 2,
  },
  {
    eventStart: new Date('2024-08-01T09:00:00.000Z'),
    eventEnd: new Date('2024-11-30T17:00:00.000Z'),
    eventDuration: 'quarter',
    title: 'Implemented Scalable Quantum Infrastructure at Quantum Nexus',
    summary:
      'Built a scalable quantum computing infrastructure for Quantum Nexus, boosting computational efficiency by 200% over 4 months.',
    details:
      'During my work on Quantum Leap, I led the design and development of a new scalable infrastructure for quantum computing simulations at Quantum Nexus. This involved optimizing resource allocation and network latency reduction strategies. As a result, the computational efficiency increased by 200%, enhancing the simulation capabilities and supporting cutting-edge research.',
    companyId: 'e3856e75-37cf-4640-afd9-e73a53fa967d',
    projectId: '84451830-87ea-4453-b341-40600c1febe0',
    impact: 2,
  },
  {
    eventStart: new Date('2024-12-01T09:00:00.000Z'),
    eventEnd: new Date('2025-05-10T17:00:00.000Z'),
    eventDuration: 'half year',
    title: 'Developed Innovation Platform with 99% Uptime at InnovateHub',
    summary:
      'Created an innovation management platform with 99% uptime for InnovateHub, significantly enhancing operational functionality over 5 months.',
    details:
      'At InnovateHub, I contributed to the Innovation Pathway project by engineering a new platform for innovation management. Focusing on architecture stability and high availability, I ensured that the system maintained a 99% uptime. This platform empowered users with better management tools and contributed to fostering a more innovative work environment.',
    companyId: 'b1811fbb-5768-4cb8-9faf-66d0fab08f36',
    projectId: '55526e8d-3b6b-4a9b-8ba6-3f3a3681d894',
    impact: 2,
  },
];

const instructions = [
  'Consider the chat history and context to understand the full scope of each achievement.',
  `Pay special attention to:
  1. Recent updates or progress reports
  2. Completed milestones or phases
  3. Team growth or leadership responsibilities
  4. Quantitative metrics or impact
  5. Technical implementations or solutions`,
  `Each achievement should have a clear, action-oriented title (REQUIRED) that:
  - Starts with an action verb (e.g., Led, Launched, Developed)
  - Includes specific metrics when possible (e.g., "40% reduction", "2x improvement")
  - Mentions specific systems or teams affected
  - Is between 10 and 256 characters
  Example good titles:
  - "Led Migration of 200+ Services to Cloud Platform"
  - "Reduced API Response Time by 40% through Caching"
  - "Grew Frontend Team from 5 to 12 Engineers"`,
  'Create a concise summary highlighting key metrics and impact. Do not add anything beyond what the user told you.',
  'Create a detailed description including context and significance. Do not add anything beyond what the user told you. Do not speculate',
  'If possible, include the event duration (day/week/month/quarter/half year/year)',
  'If the user is clearly indicating a specific company, provide the company ID (or null if none)',
  'If the user clearly indicated a specific project, but did not mention the company, provide the companyId from the project if it has one',
  'If the user is clearly indicating a specific project, provide the project ID (or null if none)',
  `Create an eventStart date if possible. If the user tells you they did something on a specific date, include it.`,
  'Create an eventEnd date if possible. If the user does not explicitly mention an end date, do not return one',
  `Impact rating (1-3) based on these criteria:,
   - Level 1 (Low): Routine tasks, individual/small team benefit, short-term impact
   - Level 2 (Medium): Notable improvements, team/department benefit, medium-term impact
   - Level 3 (High): Major initiatives, org-wide benefit, long-term strategic impact`,
  'Each Achievement should be complete and self-contained.',
  'If the user mentions multiple achievements in a single message, extract them all.',
  `Consider only the single message inside <user-input> when creating Achievements. If the user mentions achievements in the <chat-history>
you are given, you should not extract them because they have already been extracted. However, if those previous messages are relevant to the current
message, you should use them to inform your extraction.`,
  `Example good titles:
  - "Led Migration of 200+ Services to Cloud Platform"
  - "Reduced API Response Time by 40% through Caching"
  - "Grew Frontend Team from 5 to 12 Engineers"`,
];

export function ExtractAchievementsPrompt({
  companies,
  projects,
  message,
  chatHistory,
  userInstructions,
}: {
  companies: Company[];
  projects: Project[];
  message: string;
  chatHistory: any[];
  userInstructions?: string;
}) {
  return (
    <Prompt>
      <Purpose>
        You are a careful and attentive assistant who extracts work achievements
        from conversations between users and AI assistants. Extract all of the
      </Purpose>
      <Instructions instructions={instructions} />
      <InputFormat>
        <user-input>
          The message that the user just sent you to extract achievements from
        </user-input>
        <chat-history>
          Recent chat history between the user and AI assistant
        </chat-history>
        <companies>
          All of the companies that the user works at (or has worked at)
        </companies>
        <projects>
          All of the projects that the user works on (or has worked on)
        </projects>
        <user-instructions>
          Any specific instructions from the user to guide the extraction
          process
        </user-instructions>
      </InputFormat>
      <Variables>
        <Companies companies={companies} />
        <Projects projects={projects} />
        <today>{new Date().toLocaleDateString()}</today>
        <user-instructions>{userInstructions}</user-instructions>
        <ChatHistory messages={chatHistory} />
        <UserInput>{message}</UserInput>
      </Variables>
      <Examples examples={examples.map((e) => JSON.stringify(e, null, 4))} />
    </Prompt>
  );
}
