import { singleBragExamples } from '../../../evals/single-brag/dataset';
import type { Brag, Conversation } from '../../../evals/types';

describe('Single Brag Dataset', () => {
  test('each example has required fields', () => {
    singleBragExamples.forEach((example: Conversation) => {
      // Basic structure
      expect(example).toHaveProperty('description');
      expect(example).toHaveProperty('input');
      expect(example).toHaveProperty('chat_history');
      expect(example).toHaveProperty('expected.brag');
      expect(example).toHaveProperty('expected.response');

      // Brag structure
      const brag: Brag = example.expected.brag;
      expect(brag).toHaveProperty('title');
      expect(brag).toHaveProperty('summary');
      expect(brag).toHaveProperty('details');
      expect(brag).toHaveProperty('eventStart');
      expect(brag).toHaveProperty('eventEnd');
      expect(brag).toHaveProperty('eventDuration');
    });
  });

  test('dates are valid', () => {
    singleBragExamples.forEach((example: Conversation) => {
      expect(example.expected.brag.eventStart).toBeInstanceOf(Date);
      expect(example.expected.brag.eventEnd).toBeInstanceOf(Date);
      expect(example.expected.brag.eventEnd.getTime()).toBeGreaterThanOrEqual(
        example.expected.brag.eventStart.getTime()
      );
    });
  });

  test('event duration is valid', () => {
    const validDurations = ['day', 'week', 'month', 'quarter', 'half year', 'year'];
    singleBragExamples.forEach((example: Conversation) => {
      expect(validDurations).toContain(example.expected.brag.eventDuration);
    });
  });

  test('descriptions and responses are meaningful', () => {
    singleBragExamples.forEach((example: Conversation) => {
      expect(example.description.length).toBeGreaterThan(10);
      expect(example.expected.response.length).toBeGreaterThan(20);
    });
  });
});
