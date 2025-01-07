'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { WelcomeCarousel } from '@/components/welcome/carousel';
import { ChatDemo } from '@/components/welcome/chat-demo';
import { useUser } from '@/hooks/use-user';

const WELCOME_CARDS = [
  {
    title: 'Track Your Achievements',
    description:
      "Simply tell me about your work, and I'll help you track your achievements. No more forgetting what you've accomplished!",
    demo: <ChatDemo />,
  },
  // {
  //   title: 'Organize Your Work',
  //   description:
  //     'Optionally organize achievements by company and project. Perfect for consultants and anyone working across multiple teams.',
  //   demo: <ProjectDemo />,
  // },
  {
    title: 'Generate Reports',
    description:
      "When it's time for your performance review, I'll help you generate a comprehensive report of your achievements.",
    image: '/images/report-example.png',
  },
];

export default function WelcomePage() {
  const router = useRouter();
  const { user, updateUser } = useUser();

  const handleComplete = React.useCallback(async () => {
    if (!user) return;

    // Update user preferences
    await updateUser({
      preferences: {
        ...user.preferences,
        hasSeenWelcome: true,
      },
    });

    // Redirect to chat
    router.push('/chat');
  }, [router, user, updateUser]);

  const handleSkip = React.useCallback(async () => {
    if (!user) return;

    // Update user preferences silently
    await updateUser({
      preferences: {
        ...user.preferences,
        hasSeenWelcome: true,
      },
    });

    // Redirect to chat
    router.push('/chat');
  }, [router, user, updateUser]);

  // If user has already seen welcome, redirect to chat
  // React.useEffect(() => {
  //   if (user?.preferences?.hasSeenWelcome) {
  //     router.push("/chat");
  //   }
  // }, [router, user?.preferences?.hasSeenWelcome]);

  if (!user) return null;

  return (
    <WelcomeCarousel
      cards={WELCOME_CARDS}
      onComplete={handleComplete}
      onSkip={handleSkip}
    />
  );
}
