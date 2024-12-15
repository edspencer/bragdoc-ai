import { Conversation } from '../types';
import fs from 'fs';
import path from 'path';

// Templates for generating varied achievements
const achievementTemplates = [
  {
    category: 'Technical',
    templates: [
      {
        input: "Just optimized our database queries, cut response time by {metric}%",
        title: "Database Optimization - {metric}% Performance Improvement",
        summary: "Optimized database queries resulting in {metric}% reduction in response time",
        details: "Implemented database query optimizations through indexing and query restructuring, achieving a {metric}% reduction in response time. This improvement impacts system-wide performance and user experience.",
      },
      {
        input: "Finally got the new microservice architecture deployed, handling {metric} requests per second now",
        title: "Microservice Architecture Deployment",
        summary: "Successfully deployed new microservice architecture handling {metric} RPS",
        details: "Led the deployment of a new microservice architecture capable of processing {metric} requests per second. This modernization effort improves system scalability and maintenance.",
      }
    ]
  },
  {
    category: 'Leadership',
    templates: [
      {
        input: "Just finished mentoring {metric} junior devs through their first production deployment",
        title: "Mentored Team Through Production Deployment",
        summary: "Successfully mentored {metric} junior developers in production deployment",
        details: "Provided mentorship and guidance to {metric} junior developers through their first production deployment, ensuring knowledge transfer and building team confidence in deployment processes.",
      },
      {
        input: "Completed our team's transition to agile, improved sprint velocity by {metric}%",
        title: "Agile Transformation Leadership",
        summary: "Led team's agile transformation, achieving {metric}% sprint velocity improvement",
        details: "Spearheaded the team's transition to agile methodologies, resulting in a {metric}% increase in sprint velocity. Successfully implemented new processes and practices that enhanced team productivity.",
      }
    ]
  },
  {
    category: 'Casual',
    templates: [
      {
        input: "btw, fixed that annoying bug in the login flow that was driving everyone crazy",
        title: "Login Flow Bug Resolution",
        summary: "Fixed critical bug in authentication system",
        details: "Identified and resolved a persistent bug in the login flow that was impacting user experience. The fix improves system reliability and reduces user frustration.",
      },
      {
        input: "had a good week - managed to get that old legacy system finally retired",
        title: "Legacy System Retirement",
        summary: "Successfully decommissioned legacy system",
        details: "Completed the retirement of an outdated legacy system, reducing technical debt and maintenance overhead while ensuring smooth transition to modern solutions.",
      }
    ]
  },
  {
    category: 'Process',
    templates: [
      {
        input: "Finally got the team to adopt code reviews. Already seeing better code quality!",
        title: "Code Review Process Implementation",
        summary: "Established team-wide code review practices",
        details: "Implemented a structured code review process, leading to improved code quality, knowledge sharing, and reduced defects in production deployments.",
      },
      {
        input: "Set up automated testing for the frontend components. No more manual QA needed for basic UI changes.",
        title: "Frontend Testing Automation",
        summary: "Implemented automated testing for UI components",
        details: "Established automated testing framework for frontend components, reducing manual QA effort and improving deployment confidence through consistent test coverage.",
      }
    ]
  },
  {
    category: 'Team',
    templates: [
      {
        input: "Really proud of how the team handled the platform migration last week. Everyone stepped up.",
        title: "Successful Platform Migration",
        summary: "Led cross-functional team through platform migration",
        details: "Coordinated and executed a complex platform migration with the team, demonstrating strong collaboration and technical leadership while maintaining system stability.",
      },
      {
        input: "Our documentation initiative is paying off - new team members are getting up to speed much faster now",
        title: "Documentation Impact",
        summary: "Improved team onboarding through documentation",
        details: "Led documentation improvement initiative that significantly reduced onboarding time for new team members and improved overall team knowledge sharing.",
      }
    ]
  }
];

const generateMetric = (min: number, max: number): number => {
  return Math.floor(Math.random() * (max - min + 1)) + min;
};

const generateTimeframe = (referenceDate: Date): { start: Date; end: Date; duration: 'day' | 'week' | 'month' | 'quarter' | 'year' } => {
  const durations = ['day', 'week', 'month', 'quarter', 'year'] as const;
  const duration = durations[Math.floor(Math.random() * durations.length)];
  
  const end = new Date(referenceDate);
  const start = new Date(referenceDate);
  
  // Adjust start date based on duration
  switch(duration) {
    case 'day':
      start.setDate(end.getDate() - 1);
      break;
    case 'week':
      start.setDate(end.getDate() - 7);
      break;
    case 'month':
      start.setMonth(end.getMonth() - 1);
      break;
    case 'quarter':
      start.setMonth(end.getMonth() - 3);
      break;
    case 'year':
      start.setFullYear(end.getFullYear() - 1);
      break;
  }
  
  return { start, end, duration };
};

export const generateBragConversation = (referenceDate: Date): Conversation => {
  // Randomly select a category and template
  const category = achievementTemplates[Math.floor(Math.random() * achievementTemplates.length)];
  const template = category.templates[Math.floor(Math.random() * category.templates.length)];
  
  // Generate a random metric
  const metric = generateMetric(20, 95);
  
  // Generate timeframe
  const timeframe = generateTimeframe(referenceDate);
  
  // Replace placeholders with actual values
  const filledTemplate = {
    input: template.input.replace('{metric}', metric.toString()),
    title: template.title.replace('{metric}', metric.toString()),
    summary: template.summary.replace('{metric}', metric.toString()),
    details: template.details.replace('{metric}', metric.toString()),
  };
  
  return {
    description: `${category.category} achievement with metrics`,
    input: filledTemplate.input,
    chat_history: [],
    expected: {
      brag: {
        title: filledTemplate.title,
        summary: filledTemplate.summary,
        details: filledTemplate.details,
        eventStart: timeframe.start,
        eventEnd: timeframe.end,
        eventDuration: timeframe.duration
      },
      response: `That's impressive! I've recorded your ${category.category.toLowerCase()} achievement. Would you like to add any additional context about the impact or process?`
    }
  };
};

export const generateAndSaveConversations = (
  count: number,
  outputDir: string,
  referenceDate: Date
): void => {
  // Create output directory if it doesn't exist
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  
  // Generate conversations
  const conversations: Conversation[] = Array.from(
    { length: count },
    () => generateBragConversation(referenceDate)
  );
  
  // Save to JSON file
  const outputPath = path.join(outputDir, `generated_conversations_${Date.now()}.json`);
  fs.writeFileSync(outputPath, JSON.stringify(conversations, null, 2));
  
  console.log(`Generated ${count} conversations and saved to ${outputPath}`);
};

// Example usage:
// const referenceDate = new Date('2024-12-14T19:35:27-05:00');
// generateAndSaveConversations(5, './generated', referenceDate);
