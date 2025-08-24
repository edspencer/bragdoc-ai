import { generateUUID } from 'lib/utils';
import { Chat } from 'components/chat';
import { DEFAULT_MODEL_NAME } from 'lib/ai/models';

export default async function ChatPage() {
  const id = generateUUID();

  return (
    <Chat
      key={id}
      id={id}
      initialMessages={[]}
      selectedModelId={DEFAULT_MODEL_NAME}
      selectedVisibilityType="private"
      isReadonly={false}
    />
  );
}
