'use client';

import Link from 'next/link';
import Image from 'next/image';
import { edProfile, nataliaProfile } from '@/lib/team-data';
import { useState, useEffect } from 'react';

// Select some notable agents to showcase (including Gandalf!)
const featuredAgents = [
  {
    name: 'Gandalf',
    avatar: '/team/gandalf-spencer.jpg',
    isPhoto: true,
  },
  {
    name: 'Spec Writer',
    avatar: 'https://api.dicebear.com/9.x/micah/svg?seed=spec-writer',
  },
  {
    name: 'Code Writer',
    avatar: 'https://api.dicebear.com/9.x/micah/svg?seed=code-writer',
  },
  {
    name: 'Browser Tester',
    avatar: 'https://api.dicebear.com/9.x/micah/svg?seed=browser-tester',
  },
  {
    name: 'Engineering Manager',
    avatar: 'https://api.dicebear.com/9.x/micah/svg?seed=engineering-manager',
  },
  {
    name: 'Blog Writer',
    avatar: 'https://api.dicebear.com/9.x/micah/svg?seed=blog-writer',
  },
  {
    name: 'Plan Writer',
    avatar: 'https://api.dicebear.com/9.x/micah/svg?seed=plan-writer',
  },
  {
    name: 'Code Checker',
    avatar: 'https://api.dicebear.com/9.x/micah/svg?seed=code-checker',
  },
  {
    name: 'Documentation Manager',
    avatar: 'https://api.dicebear.com/9.x/micah/svg?seed=documentation-manager',
  },
  {
    name: 'Marketing Site Manager',
    avatar:
      'https://api.dicebear.com/9.x/micah/svg?seed=marketing-site-manager',
  },
  {
    name: 'Screenshotter',
    avatar: 'https://api.dicebear.com/9.x/micah/svg?seed=screenshotter',
  },
];

interface AgentAvatarProps {
  agent: { name: string; avatar: string; isPhoto?: boolean };
  size: number;
  index: number;
}

function AgentAvatar({ agent, size, index }: AgentAvatarProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [position, setPosition] = useState<{
    top: string;
    left: string;
  } | null>(null);

  useEffect(() => {
    // Generate random position on mount
    const randomTop = Math.random() * 70 + 5; // 5% to 75%
    const randomLeft = Math.random() * 70 + 5; // 5% to 75%
    setPosition({ top: `${randomTop}%`, left: `${randomLeft}%` });
  }, []);

  // Don't render until we have a position (prevents flash)
  if (!position) return null;

  return (
    <div
      className={`absolute animate-float transition-all duration-300 ${isHovered ? 'z-40 scale-125' : 'z-10'}`}
      style={{
        top: position.top,
        left: position.left,
        animationDelay: `${index * 0.3}s`,
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <Link href="/team" className="relative block">
        <div
          className="rounded-full overflow-hidden border-4 border-white/20 shadow-xl transition-all duration-300 backdrop-blur-sm bg-white/30"
          style={{ width: size, height: size }}
        >
          <Image
            src={agent.avatar}
            alt={agent.name}
            width={size}
            height={size}
            unoptimized={!agent.isPhoto}
            className="object-cover"
          />
        </div>
        {/* Agent name on hover - appears below avatar */}
        <div
          className={`absolute top-full left-1/2 -translate-x-1/2 mt-2 px-3 py-1.5 bg-foreground text-background text-xs font-medium rounded-md whitespace-nowrap transition-opacity duration-300 z-50 ${
            isHovered ? 'opacity-100' : 'opacity-0 pointer-events-none'
          }`}
        >
          {agent.name}
        </div>
      </Link>
    </div>
  );
}

export function MeetTheTeamIntro() {
  return (
    <section className="py-24 px-4 sm:px-6 lg:px-8 bg-gradient-to-br from-background via-muted/20 to-background overflow-hidden">
      <div className="container mx-auto max-w-7xl">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Left side: Text content */}
          <div className="space-y-6">
            <h2 className="text-4xl sm:text-5xl font-bold tracking-tight">
              Hi, I&apos;m Ed 👋
            </h2>
            <div className="space-y-4 text-lg text-muted-foreground leading-relaxed">
              <p>
                I built BragDoc to solve a problem that plagued my own career
                transitions—tracking and articulating my professional
                achievements.
              </p>
              <p>
                Together with Natalia and our Chief Morale Officer Gandalf, we
                lead a team of 14 specialized AI agents that power BragDoc's
                development.
              </p>
              <p>
                Click an agent on the right to learn more about our agentic team
                and how we build software together.
              </p>
            </div>

            {/* Profile cards for Ed and Natalia */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-4">
              <div className="flex items-center gap-3">
                <Link
                  href="/team"
                  className="relative w-16 h-16 rounded-full overflow-hidden border-2 border-muted shadow-md hover:scale-105 transition-transform"
                >
                  <Image
                    src={edProfile.avatarUrl!}
                    alt={edProfile.name}
                    width={64}
                    height={64}
                    className="object-cover"
                  />
                </Link>
                <div>
                  <Link href="/team" className="hover:underline">
                    <p className="font-semibold text-foreground">
                      {edProfile.name}
                    </p>
                  </Link>
                  <p className="text-sm text-muted-foreground">
                    {edProfile.role.split('/')[0].trim()}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Link
                  href="/team"
                  className="relative w-16 h-16 rounded-full overflow-hidden border-2 border-muted shadow-md hover:scale-105 transition-transform"
                >
                  <Image
                    src={nataliaProfile.avatarUrl!}
                    alt={nataliaProfile.name}
                    width={64}
                    height={64}
                    className="object-cover"
                  />
                </Link>
                <div>
                  <Link href="/team" className="hover:underline">
                    <p className="font-semibold text-foreground">
                      {nataliaProfile.name}
                    </p>
                  </Link>
                  <p className="text-sm text-muted-foreground">
                    {nataliaProfile.role}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Right side: Agent avatar collage */}
          <div className="relative h-[500px] lg:h-[600px] group agent-container">
            {/* Agent avatars scattered randomly */}
            {featuredAgents.map((agent, index) => {
              // Stable varied sizes for visual interest - Gandalf gets a bigger size!
              const sizes = [
                150, 96, 128, 112, 144, 104, 120, 116, 108, 132, 100,
              ];
              return (
                <AgentAvatar
                  key={agent.name}
                  agent={agent}
                  size={sizes[index] || 112}
                  index={index}
                />
              );
            })}
          </div>
        </div>
      </div>

      {/* CSS for floating animation */}
      <style jsx>{`
        @keyframes float {
          0%,
          100% {
            transform: translateY(0px) translateX(0px);
          }
          25% {
            transform: translateY(-16px) translateX(8px);
          }
          50% {
            transform: translateY(-24px) translateX(-8px);
          }
          75% {
            transform: translateY(-16px) translateX(8px);
          }
        }

        :global(.animate-float) {
          animation: float 8s ease-in-out infinite;
        }
      `}</style>
    </section>
  );
}
