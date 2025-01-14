import { getProjectById } from '@/lib/db/projects/queries';
import { getAchievements, getCompanyById, } from '@/lib/db/queries';
import type { Achievement, Company, Project, User, Message } from '@/lib/db/schema';
import { streamText } from 'ai';
import { documentWritingModel } from '.';

export interface PreparePromptDataArgs {
  title: string;
  days: number;
  user: User;
  projectId: string;
  companyId: string;
  chatHistory: Message[]
}

export type DocumentPromptData = {
  title: string;
  days: number;
  user: Partial<User>;
  project?: Project;
  company?: Company;
  achievements: any[];
  userInstructions?: string;
  chatHistory?: Message[],

  companiesStr?: string;
  projectsStr?: string;
  chatStr?: string;
}

/**
 * Fetches all the data needed to generate a document based on the parameters
 * provided by the LLM. This function is expected to be fed by an LLM tool call,
 * with just the user object being passed from the session
 * @returns The DocumentPromptData that can then be used to generate the document
 */
export async function preparePromptData({
  title,
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
    title,
    days,
    user,
    project: project || undefined,
    company: company || undefined,
    achievements: achievements.achievements,
    userInstructions,
    chatHistory
  }
}

export async function prepareAndGenerateDocument(promptData: PreparePromptDataArgs, streamTextOptions?: typeof streamText) {
  const preparedPromptData = await preparePromptData(promptData);
  return generateDocument(preparedPromptData, streamTextOptions);
}

export async function generateDocument(promptData: DocumentPromptData, streamTextOptions?: typeof streamText) {
  const prompt = await renderPrompt(promptData);

  return streamText({
    model: documentWritingModel,
    prompt,
    ...streamTextOptions
  });
}

/**
 * Renders the prompt that asks the LLM to generate a document
 * @returns The full prompt to be fed to the LLM
 */
export async function renderPrompt({
  title,
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

  const prompt = `
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
  <title>The title of the document being generated, if the user provided one</title>
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
  <title>${title}</title>
  <language>${user.preferences?.language}</language>
  <userInstructions>${userInstructions}</userInstructions>
  <project>${project ? renderProject(project) : ''}</project>
  <company>${company ? renderCompany(company) : ''}</company>
  <achievements>${achievements.map(renderAchievement).join('\n')}</achievements>
  <days>${days}</days>
  <chatHistory>${chatHistory?.map(renderMessage).join('\n')}</chatHistory>
  <today>${today}</today>
</data>

<examples>

</examples>
`
  
  return prompt
}

const renderProject = (project: Project) => {
  return `
    <project>
      <name>${project.name}</name>
      <id>${project.id}</id>
      <description>${project.description}</description>
      <status>${project.status}</status>
      <startDate>${project.startDate}</startDate>
      <endDate>${project.endDate || 'Present'}</endDate>
    </project>
  `;
}

const renderCompany = (company: Company) => {
  return `
    <company>
      <name>${company.name}</name>
      <id>${company.id}</id>
      <role>${company.role}</role>
      <domain>${company.domain || 'N/A'}</domain>
      <startDate>${company.startDate.toISOString()}</startDate>
      <endDate>${company.endDate ? company.endDate.toISOString() : 'Present'}</endDate>
    </company>
  `;
}

const renderAchievement = (achievement: Achievement) => {
  return `
    <achievement>
      <title>${achievement.title}</title>
      <summary>${achievement.summary}</summary>
      <details>${achievement.details}</details>
      <impact>${achievement.impact}</impact>
    </achievement>
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

export {
  renderProject, 
  renderCompany,
  renderAchievement,
  renderMessage
}