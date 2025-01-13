import { getProjectById } from '@/lib/db/projects/queries';
import { getAchievements, getCompanyById, getUserById } from '@/lib/db/queries';
import { getProjectById } from '@/lib/db/projects/queries';
import { getAchievements, getCompanyById } from '@/lib/db/queries';
import { Achievement, Company, Project, User, Message } from '@/lib/db/schema';
import { streamText } from 'ai';
import { documentWritingModel } from '.';

interface PreparePromptDataArgs {
  name: string;
  days: number;
  user: User;
  projectId: string;
  companyId: string;
  chatHistory: Message[]
}

export type DocumentPromptData = {
  name: string;
  days: number;
  user: User;
  project?: Project;
  company?: Company;
  achievements: any[];
  userInstructions?: string;
  chatHistory?: Message[]
}

/**
 * Fetches all the data needed to generate a document based on the parameters
 * provided by the LLM. This function is expected to be fed by an LLM tool call,
 * with just the user object being passed from the session
 * @returns The DocumentPromptData that can then be used to generate the document
 */
export async function preparePromptData({
  name,
  days = 7,
  user,
  projectId,
  companyId,
  chatHistory
}: PreparePromptDataArgs): Promise<DocumentPromptData> {
  const userId = user.id;

  const [project, company, achievements] = await Promise.all([
    projectId ? getProjectById(projectId, userId) : null,
    companyId ? getCompanyById({ id: companyId, userId }) : null,
    getAchievements({
      userId,
      projectId,
      startDate: new Date(Date.now() - days * 24 * 60 * 60 * 1000),
      limit: 200
    })
  ])

  const userInstructions = user.preferences.documentInstructions || '';

  return {
    name,
    days,
    user,
    project: project || undefined,
    company: company || undefined,
    achievements: achievements.achievements,
    userInstructions,
    chatHistory
  }
}

export async function generateDocument(promptData: DocumentPromptData) {
  return streamText({
    model: documentWritingModel,
    prompt: await renderPrompt(promptData)
  });
}

/**
 * Renders the prompt that asks the LLM to generate a document
 * @returns The full prompt to be fed to the LLM
 */
export async function renderPrompt({
  name,
  days,
  user,
  project,
  company,
  achievements,
  userInstructions,
  chatHistory
}: DocumentPromptData) {
  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return `
<purpose>
You are a document writer in the service of a user of the bragdoc.ai application.
</purpose>

<background>
bragdoc.ai helps people track their professional achievements and generate documents
such as weekly updates to their managers, monthly updates to their skip-level managers,
and performance review documents. The user of bragdoc.ai can ask you to generate these
documents for them.
</background>

<instructions>
- Use the configured language for this document
- Do not make reference to the company unless asked to
- Do not add fluff, exaggeration or boast
- Markdown is supported
- Use headings whenever appropriate
- Group related achievements together
- Give more precedence to achievements with a higher impact rating
- Pay attention to the chatHistory, if present, and respond to what the user is asking for
</instructions>

<variables>
  <name>The name of the document being generated, if the user provided one</name>
  <language>The language to use for this document</language>
  <days>The number of days for which the document is being generated</days>
  <userInstructions>Instructions from the user for how to write the document</userInstructions>
  <project>If present, the project for which the document is being generated</project>
  <company>If present, the company for which the document is being generated</company>
  <achievements>The Achievements that the user has logged for this project and period</achievements>
  <chatHistory>The chat history between the user and the chatbot</chatHistory>
  <today>Today's date</today>
</variables>

<data>
  <name>${name}</name>
  <language>${user.preferences.language}</language>
  <userInstructions>${userInstructions}</userInstructions>
  <project>${project ? renderProject(project) : ''}</project>
  <company>${company ? renderCompany(company) : ''}</company>
  <achievements>${achievements.map(renderAchievement).join('\n')}</achievements>
  <days>${days}</days>
  <chatHistory>${chatHistory && chatHistory.map(renderMessage).join('\n')}</chatHistory>
  <today>${today}</today>
</data>

<examples>

</examples>
`
}

const renderProject = (project: Project) => {
  return `
    <name>${project.name}</name>
    <id>${project.id}</id>
    <description>${project.description}</description>
    <status>${project.status}</status>
    <startDate>${project.startDate}</startDate>
    <endDate>${project.endDate || 'Present'}</endDate>
  `;
}

const renderCompany = (company: Company) => {
  return `
    <n>${company.name}</n>
    <id>${company.id}</id>
    <role>${company.role}</role>
    <domain>${company.domain || 'N/A'}</domain>
    <startDate>${company.startDate.toISOString()}</startDate>
    <endDate>${company.endDate ? company.endDate.toISOString() : 'Present'}</endDate>
  `;
}

const renderAchievement = (achievement: Achievement) => {
  return `
    <title>${achievement.title}</title>
    <summary>${achievement.summary}</summary>
    <details>${achievement.details}</details>
    <impact>${achievement.impact}</impact>
  `;
}

const renderMessage = (message: Message) => {
  return `
  <message>
    <role>${message.role}</role>
    <content>${message.content}</content>
  </message>
  `;
}