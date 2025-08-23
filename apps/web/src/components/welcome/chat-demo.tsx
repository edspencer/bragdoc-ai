'use client';

import * as React from 'react';
import { Messages } from '@/components/messages';
import type { Message } from 'ai';
import { nanoid } from 'nanoid';
import { useWindowSize } from 'usehooks-ts';
import type { UIBlock } from '../block';

const EXAMPLE_MESSAGE =
  'I fixed up the bugs with the autofocus dashboard generation and we launched autofocus version 2.1 this morning. I also added a new feature to do custom printing jobs.';

const ACHIEVEMENTS = [
  'Fixed bugs in autofocus dashboard generation',
  'Launched autofocus version 2.1',
  'Added custom printing jobs feature',
];

const achievementsInTool = [
  {
    id: '27b52952-7110-4d9b-9d39-5597b08a067a',
    userId: '3a1c14ea-2eee-4eb7-b0c0-2a10dcf00216',
    companyId: null,
    projectId: null,
    userMessageId: '1685d049-490d-4fd5-bc8a-75a78e65cd4a',
    title: 'New Achievement Display',
    summary: 'Improved the chat UI to correctly display new achievements.',
    details:
      'Refactored the chat user interface to properly display new achievements. This involved modifying the existing UI components and logic to accommodate the new achievement display format and styling.',
    eventStart: '2024-12-23T00:00:00.000Z',
    eventEnd: null,
    eventDuration: 'day',
    isArchived: false,
    source: 'manual',
    impact: 2,
    impactSource: 'llm',
    impactUpdatedAt: '2024-12-23T16:04:27.633Z',
    createdAt: '2024-12-23T16:04:27.633Z',
    updatedAt: '2024-12-23T16:04:27.633Z',
  },
  {
    id: '4e6141c4-d033-4a29-a5d1-565a3d7a244b',
    userId: '3a1c14ea-2eee-4eb7-b0c0-2a10dcf00216',
    companyId: null,
    projectId: null,
    userMessageId: '1685d049-490d-4fd5-bc8a-75a78e65cd4a',
    title: 'Achievement Data Persistence',
    summary:
      'Enabled saving of achievement data to the database for persistence.',
    details:
      'Implemented the functionality to save achievement data to the database. This involved creating the necessary database schema and API endpoints to handle the storage and retrieval of achievement information.',
    eventStart: '2024-12-23T00:00:00.000Z',
    eventEnd: null,
    eventDuration: 'day',
    isArchived: false,
    source: 'manual',
    impact: 2,
    impactSource: 'llm',
    impactUpdatedAt: '2024-12-23T16:04:28.822Z',
    createdAt: '2024-12-23T16:04:28.822Z',
    updatedAt: '2024-12-23T16:04:28.822Z',
  },
  {
    id: '9e15b3e6-75aa-42fc-8ca6-5f1f2e035e2e',
    userId: '3a1c14ea-2eee-4eb7-b0c0-2a10dcf00216',
    companyId: null,
    projectId: null,
    userMessageId: '1685d049-490d-4fd5-bc8a-75a78e65cd4a',
    title: 'Initial Summary Document',
    summary: 'Created the first version of summary document generation.',
    details:
      'Developed the initial functionality for generating summary documents. This involved creating the necessary logic to extract relevant information and format it into a document.',
    eventStart: '2024-12-23T00:00:00.000Z',
    eventEnd: null,
    eventDuration: 'day',
    isArchived: false,
    source: 'manual',
    impact: 2,
    impactSource: 'llm',
    impactUpdatedAt: '2024-12-23T16:04:29.282Z',
    createdAt: '2024-12-23T16:04:29.282Z',
    updatedAt: '2024-12-23T16:04:29.282Z',
  },
];

const allMessages = [
  {
    id: 'cb5b99f3-2d8a-496b-b9c9-108dbe41e3c1',
    role: 'user',
    content:
      'Achievements today:\n\n- Fixed up the way we show new Achievements in the chat UI\n- Save achievements to the database\n- Initial summary document generation working',
    toolInvocations: [],
  },
  {
    id: '0b0638b3-5b1a-4cf7-9b60-52b2ab9a45d5',
    role: 'assistant',
    content: '',
    toolInvocations: [
      {
        state: 'result',
        toolCallId: 'call_3wKLG25K0JCs7pT6dUG7tAPf',
        toolName: 'extractAchievements',
        args: {},
        result: {
          id: '1685d049-490d-4fd5-bc8a-75a78e65cd4a',
          achievements: achievementsInTool.slice(0, 1),
          content: 'Successfully processed 8 achievements.',
        },
      },
    ],
  },
  {
    id: 'c0fa9600-c685-42a7-8a89-cc43f3ec4a19',
    role: 'assistant',
    content:
      "I've saved your achievements for today. If you need to generate a report or document based on these achievements, just let me know!",
    toolInvocations: [],
  },
];

export function ChatDemo() {
  const [messages, setMessages] = React.useState<Message[]>([]);
  const [achievementIndex, setAchievementIndex] = React.useState(-1);
  const demoId = React.useRef(nanoid());

  const { width: windowWidth = 1920, height: windowHeight = 1080 } =
    useWindowSize();

  const [block, setBlock] = React.useState<UIBlock>({
    documentId: 'init',
    content: '',
    title: '',
    status: 'idle',
    isVisible: false,
    boundingBox: {
      top: windowHeight / 4,
      left: windowWidth / 4,
      width: 250,
      height: 50,
    },
  });

  // Initial messages setup
  React.useEffect(() => {
    const initialTimeout = setTimeout(() => {
      setMessages(allMessages.slice(0, 1) as Message[]);
    }, 100);

    // Start assistant response after 1 second
    const assistantTimeout = setTimeout(() => {
      setMessages(allMessages.slice(0, 2) as Message[]);
      setAchievementIndex(0);
    }, 1000);

    return () => clearTimeout(assistantTimeout);
  }, []);

  // Handle achievement updates
  React.useEffect(() => {
    if (achievementIndex === -1) return;
    if (achievementIndex >= achievementsInTool.length) {
      // Show final message after all achievements
      const finalTimeout = setTimeout(() => {
        setMessages((prevMessages) => [
          ...prevMessages,
          allMessages[2] as Message,
        ]);
      }, 500);

      return () => clearTimeout(finalTimeout);
    }

    const timeout = setTimeout(() => {
      setMessages((prevMessages) => {
        const lastMessage = prevMessages[prevMessages.length - 1];
        if (!lastMessage.toolInvocations?.[0]) return prevMessages;

        const toolInvocation = lastMessage.toolInvocations[0] as {
          result: { achievements: typeof achievementsInTool };
        };

        // Create new message object
        const newLastMessage = {
          ...lastMessage,
          toolInvocations: [
            {
              ...lastMessage.toolInvocations[0],
              result: {
                ...toolInvocation.result,
                achievements: achievementsInTool.slice(0, achievementIndex + 1),
              },
            },
          ],
        };

        // Return new array with new message object
        return [...prevMessages.slice(0, -1), newLastMessage];
      });

      setAchievementIndex((prev) => prev + 1);
    }, 500);

    return () => clearTimeout(timeout);
  }, [achievementIndex]);

  return (
    <div className="h-[400px] overflow-hidden rounded-lg">
      <Messages
        chatId={demoId.current}
        messages={messages}
        setMessages={setMessages}
        isLoading={false}
        votes={[]}
        block={block}
        setBlock={() => {}}
        reload={() => Promise.resolve(undefined)}
        isReadonly={true}
        user={{ id: '1', name: 'John Doe' }}
      />
    </div>
  );
}
