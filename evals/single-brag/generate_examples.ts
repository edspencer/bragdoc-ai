import { generateAndSaveConversations } from './generator';

// Use the provided reference date
const referenceDate = new Date('2024-12-14T19:35:27-05:00');

// Generate 10 example conversations
generateAndSaveConversations(
  10,
  './evals/single-brag/generated',
  referenceDate,
);
