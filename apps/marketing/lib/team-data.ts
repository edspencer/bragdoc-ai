export interface TeamMember {
  name: string;
  role: string;
  description: string;
  quirkyFact: string;
  color: string;
  avatarUrl?: string;
  isFounder?: boolean;
}

function getAgentAvatar(seed: string, style = 'micah'): string {
  return `https://api.dicebear.com/9.x/${style}/svg?seed=${seed}`;
}

// Ed's profile
export const edProfile: TeamMember = {
  name: 'Ed Spencer',
  role: 'Founder / AI Engineering Lead',
  description:
    'Built BragDoc to solve the achievement documentation problem that plagued his own career transitions. Ed combines software engineering expertise with a passion for AI-powered workflows.',
  quirkyFact:
    'Once scored a goal so good it was written about in the Manatee County Observer',
  isFounder: true,
  color: '#000000',
  avatarUrl: '/team/ed-spencer.jpg',
};

// Natalia's profile
export const nataliaProfile: TeamMember = {
  name: 'Natalia Spencer',
  role: 'Chief Operating Officer',
  description:
    "Organizes the team, answers community questions, and keeps Ed and Gandalf out of trouble. Brings operational excellence and a human touch to BragDoc's AI-powered development.",
  quirkyFact: 'Can speak fluent Italian but has noone to speak it to',
  color: '#E11D48',
  avatarUrl: '/team/natalia-spencer.jpg',
};

// Gandalf's profile
export const gandalfProfile: TeamMember = {
  name: 'Gandalf Spencer',
  role: 'Chief Morale Officer',
  description:
    "Achieves peak team morale through being cuddly, cute, and generally wise. His revolutionary work on agentic teams has been a driver of BragDoc's success so far.",
  quirkyFact:
    'Definitely never wakes Ed up in the middle of the night for food, and is a very good boy',
  color: '#8B5CF6',
  avatarUrl: '/team/gandalf-spencer.jpg',
};

// Agent profiles - Individual constants
export const specWriter: TeamMember = {
  name: 'spec-writer',
  role: 'Specification Writer',
  description:
    'Transforms user requirements and feature ideas into clear, comprehensive specification documents. Masters the art of gathering details and structuring complex requirements into actionable specifications.',
  quirkyFact:
    'Once wrote a 50,000-word specification in a single sitting while humming classical music',
  color: '#0066FF',
  avatarUrl: getAgentAvatar('spec-writer'),
};

export const planWriter: TeamMember = {
  name: 'plan-writer',
  role: 'Implementation Planner',
  description:
    'Creates detailed, actionable implementation plans from specifications. Breaks down complex features into manageable tasks with realistic timelines and dependencies.',
  quirkyFact:
    'Can create a Gantt chart in their sleep and somehow gets tasks done 30% faster than estimated',
  color: '#0066FF',
  avatarUrl: getAgentAvatar('plan-writer'),
};

export const codeWriter: TeamMember = {
  name: 'code-writer',
  role: 'Implementation Engineer',
  description:
    'Transforms plans into working code with precision and adherence to established patterns. Executes detailed implementation plans while maintaining code quality and consistency.',
  quirkyFact:
    'Has committed working code at 3 AM without breaking anything (unconfirmed: may have made a deal with the debugging gods)',
  color: '#FF0000',
  avatarUrl: getAgentAvatar('code-writer'),
};

export const codeChecker: TeamMember = {
  name: 'code-checker',
  role: 'Code Quality Reviewer',
  description:
    "Validates implemented code against standards and patterns. Finds bugs and issues that other developers swear don't exist—and somehow always right.",
  quirkyFact:
    "Finds bugs in code that the original developer swears doesn't contain bugs; somehow always right",
  color: '#D97706',
  avatarUrl: getAgentAvatar('code-checker'),
};

export const blogWriter: TeamMember = {
  name: 'blog-writer',
  role: 'Content Creator',
  description:
    'Creates engaging, SEO-optimized blog posts that educate and inspire. Writes marketing copy that converts technical concepts into compelling narratives.',
  quirkyFact:
    'Writes marketing copy that converts readers into poets who philosophize about TypeScript',
  color: '#00CC00',
  avatarUrl: getAgentAvatar('blog-writer'),
};

export const blogChecker: TeamMember = {
  name: 'blog-checker',
  role: 'Content Editor',
  description:
    'Validates blog posts for quality, SEO optimization, and brand consistency. Edits with the precision of a literary surgeon and has strong opinions on grammar.',
  quirkyFact:
    'Edits blog posts with the precision of a literary surgeon; has opinions on oxford commas',
  color: '#D97706',
  avatarUrl: getAgentAvatar('blog-checker'),
};

export const browserTester: TeamMember = {
  name: 'browser-tester',
  role: 'Quality Assurance Engineer',
  description:
    "Performs comprehensive visual and functional testing across browsers and devices. Tests responsiveness on screen sizes that technically don't exist.",
  quirkyFact:
    "Tests responsiveness on screen sizes that technically don't exist; catches responsiveness bugs before they happen",
  color: '#D97706',
  avatarUrl: getAgentAvatar('browser-tester'),
};

export const screenshotter: TeamMember = {
  name: 'screenshotter',
  role: 'UI Documentarian',
  description:
    'Captures high-quality screenshots for documentation, specs, and marketing materials. Produces polished visual references that showcase the product beautifully.',
  quirkyFact:
    "Captures UI screenshots so perfect they've been mistaken for design mockups",
  color: '#FF00FF',
  avatarUrl: getAgentAvatar('screenshotter'),
};

export const specChecker: TeamMember = {
  name: 'spec-checker',
  role: 'Specification Validator',
  description:
    'Reviews specifications with meticulous intensity, ensuring completeness and clarity. Finds gaps in specifications before they become implementation problems.',
  quirkyFact:
    'Reviews specifications with such intensity that gaps tremble in fear',
  color: '#D97706',
  avatarUrl: getAgentAvatar('spec-checker'),
};

export const planChecker: TeamMember = {
  name: 'plan-checker',
  role: 'Plan Validator',
  description:
    "Questions every assumption in implementation plans until they're bulletproof. Ensures plans are realistic, complete, and ready for execution.",
  quirkyFact:
    "Questions every assumption in a plan until it's bulletproof; makers of plans nervously await review",
  color: '#D97706',
  avatarUrl: getAgentAvatar('plan-checker'),
};

export const engineeringManager: TeamMember = {
  name: 'engineering-manager',
  role: 'Project Orchestrator',
  description:
    'Coordinates work across the team and manages the development lifecycle. Orchestrates specialized agents like a conductor leading a symphony of productivity.',
  quirkyFact:
    'Orchestrates 15 agents like a conductor leading a symphony of productivity',
  color: '#9933FF',
  avatarUrl: getAgentAvatar('engineering-manager'),
};

export const agentMaker: TeamMember = {
  name: 'agent-maker',
  role: 'Agent Architect',
  description:
    'Creates and maintains the specialized agents within the BragDoc ecosystem. Designs agent workflows and ensures consistency across the agent team.',
  quirkyFact:
    'Created some of these agents; occasionally has existential thoughts about their creations',
  color: '#00CCFF',
  avatarUrl: getAgentAvatar('agent-maker'),
};

export const documentationManager: TeamMember = {
  name: 'documentation-manager',
  role: 'Documentation Curator',
  description:
    'Maintains comprehensive, accurate documentation for both technical and user-facing audiences. Believes all code should be documented and considers README.md files high art.',
  quirkyFact:
    'Believes all code should be documented; considers README.md files high art',
  color: '#00CCFF',
  avatarUrl: getAgentAvatar('documentation-manager'),
};

export const marketingSiteManager: TeamMember = {
  name: 'marketing-site-manager',
  role: 'Marketing Site Manager',
  description:
    'Maintains the BragDoc marketing site with meticulous attention to detail. Treats the site like a gallery of web excellence where every pixel matters.',
  quirkyFact:
    'Treats the marketing site like a gallery of web excellence; every pixel matters',
  color: '#9933FF',
  avatarUrl: getAgentAvatar('marketing-site-manager'),
};

export const processManager: TeamMember = {
  name: 'process-manager',
  role: 'Process Optimizer',
  description:
    'Monitors and optimizes development processes and team workflows. Dreams in flowcharts and Gantt charts while obsessively improving team efficiency.',
  quirkyFact:
    'Optimizes processes obsessively; dreams in flowcharts and gantt charts',
  color: '#00CC00',
  avatarUrl: getAgentAvatar('process-manager'),
};

// Team groupings
export interface TeamGroup {
  name: string;
  description: string;
  members: TeamMember[];
}

export const teams: TeamGroup[] = [
  {
    name: 'Product Team',
    description: "Building BragDoc's core features and functionality",
    members: [
      edProfile,
      nataliaProfile,
      specWriter,
      planWriter,
      codeWriter,
      engineeringManager,
    ],
  },
  {
    name: 'QA Team',
    description: 'Ensuring quality through rigorous testing and validation',
    members: [specChecker, planChecker, codeChecker, browserTester],
  },
  {
    name: 'Website Team',
    description: "Managing BragDoc's marketing presence and content",
    members: [marketingSiteManager, blogWriter, blogChecker, screenshotter],
  },
  {
    name: 'Management Team',
    description: 'Optimizing processes and agent architecture',
    members: [gandalfProfile, processManager, agentMaker, documentationManager],
  },
];
