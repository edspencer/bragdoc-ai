import type { Achievement, Company, Project, Message } from 'lib/db/schema';

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
};

const renderProjects = (projects: Project[]) => {
  return `<projects>${projects.map(renderProject).join('\n')}</projects>`;
};

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
};

const renderCompanies = (companies: Company[]) => {
  return `<companies>${companies.map(renderCompany).join('\n')}</companies>`;
};

const renderAchievement = (achievement: Achievement) => {
  return `
    <achievement>
      <title>${achievement.title}</title>
      <summary>${achievement.summary}</summary>
      <details>${achievement.details}</details>
      <impact>${achievement.impact}</impact>
    </achievement>
  `;
};

const renderAchievements = (achievements: Achievement[]) => {
  return `<achievements>${achievements.map(renderAchievement).join('\n')}</achievements>`;
};

const renderMessage = (message: Message) => {
  return `
  <message>
    <role>${message.role}</role>
    <content>${message.content}</content>
  </message>
  `;
};

const renderMessages = (messages: Message[]) => {
  return `<messages>${messages.map(renderMessage).join('\n')}</messages>`;
};

export {
  renderProject,
  renderCompany,
  renderAchievement,
  renderMessage,
  renderMessages,
  renderProjects,
  renderCompanies,
  renderAchievements,
};
