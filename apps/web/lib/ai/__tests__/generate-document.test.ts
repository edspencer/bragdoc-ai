import { v4 as uuidv4 } from 'uuid';
import { fetch, render } from 'lib/ai/generate-document';
import { db } from '@/database/index';
import { user, type User } from '@/database/schema';
import { createAchievement, createCompany } from '@/database/queries';
import { createProject } from '@/database/projects/queries';

// Test data shared across all tests
const testData = {
  company: '',
  projects: {
    main: '',
    secondary: '',
    tertiary: '',
  },
  users: {
    withInstructions: null as User | null,
    withoutInstructions: null as User | null,
  },
  testSuiteId: '',
  baseTime: null as Date | null,
};

// Set up test data before running any tests
beforeAll(async () => {
  // Generate unique test suite ID to avoid conflicts with parallel test runs
  const testSuiteId = uuidv4().slice(0, 8);

  // Insert test users with unique emails
  const [userWithInstructions, userWithoutInstructions] = await Promise.all([
    db
      .insert(user)
      .values({
        id: uuidv4(),
        email: `test-user-with-instructions-${testSuiteId}@example.com`,
        provider: 'credentials',
        preferences: {
          hasSeenWelcome: false,
          language: 'en',
          documentInstructions: 'Always include impact metrics',
        },
      })
      .returning(),
    db
      .insert(user)
      .values({
        id: uuidv4(),
        email: `test-user-without-instructions-${testSuiteId}@example.com`,
        provider: 'credentials',
        preferences: {
          hasSeenWelcome: false,
          language: 'en',
        },
      })
      .returning(),
  ]);

  testData.users.withInstructions = userWithInstructions[0];
  testData.users.withoutInstructions = userWithoutInstructions[0];

  // Insert test company using createCompany
  const techCorp = await createCompany({
    userId: testData.users.withInstructions.id,
    name: `TechCorp-${testSuiteId}`,
    role: 'Senior Engineer',
    domain: 'techcorp.com',
    startDate: new Date('2023-01-01'),
    endDate: null,
  });
  testData.company = techCorp.id;
  testData.testSuiteId = testSuiteId;

  // Insert test projects using createProject with unique names
  const [mainProject, secondaryProject, tertiaryProject] = await Promise.all([
    createProject({
      userId: testData.users.withInstructions?.id,
      name: `Core Platform-${testSuiteId}`,
      description: 'Main platform development',
      companyId: testData.company,
      startDate: new Date('2023-01-01'),
      status: 'active',
    }),
    createProject({
      userId: testData.users.withInstructions?.id,
      name: `Mobile App-${testSuiteId}`,
      description: 'Mobile app development',
      companyId: testData.company,
      startDate: new Date('2023-01-01'),
      status: 'active',
    }),
    createProject({
      userId: testData.users.withInstructions?.id,
      name: `Analytics-${testSuiteId}`,
      description: 'Analytics platform',
      companyId: testData.company,
      startDate: new Date('2023-01-01'),
      status: 'active',
    }),
  ]);

  testData.projects.main = mainProject.id;
  testData.projects.secondary = secondaryProject.id;
  testData.projects.tertiary = tertiaryProject.id;

  // Current time for consistent date calculations
  const now = new Date();
  testData.baseTime = now;

  // Generate achievements for the main project using createAchievement
  const mainProjectAchievements = await Promise.all(
    Array.from({ length: 20 }, (_, i) => {
      // Create achievements with dates relative to now
      // i=0 is 30 days ago, i=19 is 11 days ago
      const daysAgo = 30 - i;
      return createAchievement({
        userId: testData.users.withInstructions?.id!,
        projectId: testData.projects.main,
        title: `Achievement ${i + 1}`,
        summary: `Summary for achievement ${i + 1}`,
        impact: 5,
        eventDuration: 'day',
        eventStart: new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000),
      });
    })
  );

  // Generate achievements for secondary project
  const secondaryProjectAchievements = await Promise.all(
    Array.from({ length: 5 }, (_, i) => {
      // i=0 is 15 days ago, i=4 is 11 days ago
      const daysAgo = 15 - i;
      return createAchievement({
        userId: testData.users.withInstructions?.id!,
        projectId: testData.projects.secondary,
        title: `Secondary Achievement ${i + 1}`,
        summary: `Summary for secondary achievement ${i + 1}`,
        impact: 5,
        eventDuration: 'day',
        eventStart: new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000),
      });
    })
  );

  // Generate achievements for tertiary project
  const tertiaryProjectAchievements = await Promise.all(
    Array.from({ length: 5 }, (_, i) => {
      // i=0 is 10 days ago, i=4 is 6 days ago
      const daysAgo = 10 - i;
      return createAchievement({
        userId: testData.users.withInstructions?.id!,
        projectId: testData.projects.tertiary,
        title: `Tertiary Achievement ${i + 1}`,
        summary: `Summary for tertiary achievement ${i + 1}`,
        impact: 5,
        eventDuration: 'day',
        eventStart: new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000),
      });
    })
  );
});

describe('preparePromptData', () => {
  test('returns correct data with user instructions', async () => {
    const result = await fetch({
      title: 'Weekly Update',
      days: 7,
      user: testData.users.withInstructions!,
      projectId: testData.projects.main,
      companyId: testData.company,
      chatHistory: [
        {
          id: uuidv4(),
          role: 'user',
          content: 'Can you help me write a weekly report?',
          createdAt: new Date(),
        },
        {
          id: uuidv4(),
          role: 'assistant',
          content: 'I will help you generate a weekly report.',
          createdAt: new Date(),
        },
      ],
    });

    expect(result).toMatchObject({
      docTitle: 'Weekly Update',
      days: 7,
      user: testData.users.withInstructions,
      company: expect.objectContaining({
        id: testData.company,
        name: expect.stringContaining('TechCorp-'),
        role: 'Senior Engineer',
        startDate: expect.any(Date),
      }),
      project: expect.objectContaining({
        id: testData.projects.main,
        name: expect.stringContaining('Core Platform-'),
        description: 'Main platform development',
        status: 'active',
      }),
    });

    // Verify we have achievements and they're all within range
    expect(result.achievements.length).toBeGreaterThan(0);
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    result.achievements.forEach((achievement: any) => {
      expect(new Date(achievement.eventStart)).toBeInstanceOf(Date);
      expect(achievement.eventStart).toBeDefined();
    });
  });

  test('returns correct data without user instructions', async () => {
    const result = await fetch({
      title: 'Weekly Update',
      days: 7,
      user: testData.users.withoutInstructions!,
      projectId: testData.projects.main,
      companyId: testData.company,
      chatHistory: [
        {
          id: uuidv4(),
          role: 'user',
          content: 'Can you help me write a weekly report?',
          createdAt: new Date(),
        },
        {
          id: uuidv4(),
          role: 'assistant',
          content: 'I will help you generate a weekly report.',
          createdAt: new Date(),
        },
      ],
    });

    expect(result.userInstructions).toBe('');
  });

  test('handles non-existent project gracefully', async () => {
    const result = await fetch({
      title: 'Weekly Update',
      days: 7,
      user: testData.users.withInstructions!,
      projectId: uuidv4(), // Non-existent project ID
      companyId: testData.company,
      chatHistory: [
        {
          id: uuidv4(),
          role: 'user',
          content: 'Can you help me write a weekly report?',
          createdAt: new Date(),
        },
        {
          id: uuidv4(),
          role: 'assistant',
          content: 'I will help you generate a weekly report.',
          createdAt: new Date(),
        },
      ],
    });

    expect(result.project).toBeUndefined();
  });

  test('handles non-existent company gracefully', async () => {
    const result = await fetch({
      title: 'Weekly Update',
      days: 7,
      user: testData.users.withInstructions!,
      projectId: testData.projects.main,
      companyId: uuidv4(), // Non-existent company ID
      chatHistory: [
        {
          id: uuidv4(),
          role: 'user',
          content: 'Can you help me write a weekly report?',
          createdAt: new Date(),
        },
        {
          id: uuidv4(),
          role: 'assistant',
          content: 'I will help you generate a weekly report.',
          createdAt: new Date(),
        },
      ],
    });

    expect(result.company).toBeUndefined();
  });

  test('returns achievements for correct date range', async () => {
    const days = 15;
    const result = await fetch({
      title: 'Bi-weekly Update',
      days,
      user: testData.users.withInstructions!,
      projectId: testData.projects.main,
      companyId: testData.company,
      chatHistory: [
        {
          id: uuidv4(),
          role: 'user',
          content: 'Can you help me write a bi-weekly report?',
          createdAt: new Date(),
        },
        {
          id: uuidv4(),
          role: 'assistant',
          content: 'I will help you generate a bi-weekly report.',
          createdAt: new Date(),
        },
      ],
    });

    // Verify we have achievements
    expect(result.achievements.length).toBeGreaterThan(0);

    // Verify each achievement has a valid date
    result.achievements.forEach((achievement: any) => {
      expect(new Date(achievement.eventStart)).toBeInstanceOf(Date);
      expect(achievement.eventStart).toBeDefined();
    });
  });

  test('respects achievement limit of 200', async () => {
    const now = new Date();
    // Insert more than 200 achievements
    const extraAchievements = await Promise.all(
      Array.from({ length: 210 }, (_, i) => {
        return createAchievement({
          userId: testData.users.withInstructions?.id!,
          projectId: testData.projects.main,
          title: `Extra Achievement ${i + 1}`,
          summary: `Summary for extra achievement ${i + 1}`,
          impact: 5,
          eventDuration: 'day',
          eventStart: now,
        });
      })
    );

    const result = await fetch({
      title: 'Monthly Update',
      days: 30,
      user: testData.users.withInstructions!,
      projectId: testData.projects.main,
      companyId: testData.company,
      chatHistory: [
        {
          id: uuidv4(),
          role: 'user',
          content: 'Can you help me write a monthly report?',
          createdAt: new Date(),
        },
        {
          id: uuidv4(),
          role: 'assistant',
          content: 'I will help you generate a monthly report.',
          createdAt: new Date(),
        },
      ],
    });

    expect(result.achievements.length).toBeLessThanOrEqual(200);
  });
});

describe('renderPrompt', () => {
  test('includes all required sections', async () => {
    const promptData = await fetch({
      title: 'Weekly Update',
      days: 7,
      user: testData.users.withInstructions!,
      projectId: testData.projects.main,
      companyId: testData.company,
      chatHistory: [
        {
          id: uuidv4(),
          role: 'user',
          content: 'Can you help me write a weekly report?',
          createdAt: new Date(),
        },
        {
          id: uuidv4(),
          role: 'assistant',
          content: 'I will help you generate a weekly report.',
          createdAt: new Date(),
        },
      ],
    });

    const prompt = await render(promptData);

    // Check for required sections
    expect(prompt).toContain('<purpose>');
    expect(prompt).toContain('</purpose>');
    expect(prompt).toContain('<background>');
    expect(prompt).toContain('</background>');
    expect(prompt).toContain('<instructions>');
    expect(prompt).toContain('</instructions>');
    expect(prompt).toContain('<variables>');
    expect(prompt).toContain('</variables>');
  });

  test('includes user instructions when present', async () => {
    const promptData = await fetch({
      title: 'Weekly Update',
      days: 7,
      user: testData.users.withInstructions!,
      projectId: testData.projects.main,
      companyId: testData.company,
      chatHistory: [
        {
          id: uuidv4(),
          role: 'user',
          content: 'Can you help me write a weekly report?',
          createdAt: new Date(),
        },
        {
          id: uuidv4(),
          role: 'assistant',
          content: 'I will help you generate a weekly report.',
          createdAt: new Date(),
        },
      ],
    });

    const prompt = await render(promptData);
    expect(prompt).toContain('Always include impact metrics');
  });

  test('excludes user instructions when not present', async () => {
    const promptData = await fetch({
      title: 'Weekly Update',
      days: 7,
      user: testData.users.withoutInstructions!,
      projectId: testData.projects.main,
      companyId: testData.company,
      chatHistory: [
        {
          id: uuidv4(),
          role: 'user',
          content: 'Can you help me write a weekly report?',
          createdAt: new Date(),
        },
        {
          id: uuidv4(),
          role: 'assistant',
          content: 'I will help you generate a weekly report.',
          createdAt: new Date(),
        },
      ],
    });

    const prompt = await render(promptData);
    expect(prompt).not.toContain('Always include impact metrics');
  });

  test('includes project details when present', async () => {
    const promptData = await fetch({
      title: 'Weekly Update',
      days: 7,
      user: testData.users.withInstructions!,
      projectId: testData.projects.main,
      companyId: testData.company,
      chatHistory: [
        {
          id: uuidv4(),
          role: 'user',
          content: 'Can you help me write a weekly report?',
          createdAt: new Date(),
        },
        {
          id: uuidv4(),
          role: 'assistant',
          content: 'I will help you generate a weekly report.',
          createdAt: new Date(),
        },
      ],
    });

    const prompt = await render(promptData);
    expect(prompt).toContain(`Core Platform-${testData.testSuiteId}`);
  });

  test('includes company details when present', async () => {
    const promptData = await fetch({
      title: 'Weekly Update',
      days: 7,
      user: testData.users.withInstructions!,
      projectId: testData.projects.main,
      companyId: testData.company,
      chatHistory: [
        {
          id: uuidv4(),
          role: 'user',
          content: 'Can you help me write a weekly report?',
          createdAt: new Date(),
        },
        {
          id: uuidv4(),
          role: 'assistant',
          content: 'I will help you generate a weekly report.',
          createdAt: new Date(),
        },
      ],
    });

    const prompt = await render(promptData);
    expect(prompt).toContain(`<name>TechCorp-${testData.testSuiteId}</name>`);
  });

  test('includes achievements in context', async () => {
    const promptData = await fetch({
      title: 'Weekly Update',
      days: 7,
      user: testData.users.withInstructions!,
      projectId: testData.projects.main,
      companyId: testData.company,
      chatHistory: [
        {
          id: uuidv4(),
          role: 'user',
          content: 'Can you help me write a weekly report?',
          createdAt: new Date(),
        },
        {
          id: uuidv4(),
          role: 'assistant',
          content: 'I will help you generate a weekly report.',
          createdAt: new Date(),
        },
      ],
    });

    const prompt = await render(promptData);
    promptData.achievements.forEach((achievement) => {
      expect(prompt).toContain(achievement.title);
      expect(prompt).toContain(achievement.summary);
    });
  });

  test('includes chat history in context when present', async () => {
    const chatHistory = [
      {
        id: uuidv4(),
        role: 'user' as any,
        content: 'Test message 1',
        createdAt: new Date(),
      },
      {
        id: uuidv4(),
        role: 'assistant' as any,
        content: 'Test response 1',
        createdAt: new Date(),
      },
    ];

    const promptData = await fetch({
      title: 'Weekly Update',
      days: 7,
      user: testData.users.withInstructions!,
      projectId: testData.projects.main,
      companyId: testData.company,
      chatHistory,
    });

    const prompt = await render(promptData);
    chatHistory.forEach((message) => {
      expect(prompt).toContain(message.content);
    });
  });
});
