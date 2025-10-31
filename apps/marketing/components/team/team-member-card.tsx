'use client';

import Image from 'next/image';
import type { TeamMember, AITeamMember } from '@/lib/team-data';

interface TeamMemberCardProps {
  member: TeamMember;
}

function isAIAgent(member: TeamMember): member is AITeamMember {
  return 'file' in member;
}

export function TeamMemberCard({ member }: TeamMemberCardProps) {
  return (
    <div className="flex flex-col sm:flex-row gap-6 items-start group">
      {/* Avatar Image - Circular Portrait Style */}
      {member.avatarUrl && (
        <div className="flex-shrink-0 relative">
          <div className="relative w-32 h-32 rounded-full overflow-hidden border-4 border-muted bg-muted shadow-lg transition-transform group-hover:scale-105">
            <Image
              src={member.avatarUrl}
              alt={member.name}
              width={128}
              height={128}
              unoptimized
              className="object-cover"
            />
          </div>
          {/* Optional: Colored ring accent */}
          <div
            className="absolute inset-0 rounded-full border-4 opacity-0 group-hover:opacity-20 transition-opacity pointer-events-none"
            style={{ borderColor: member.color }}
          />
        </div>
      )}

      {/* Content */}
      <div className="flex-1 min-w-0">
        {/* Name */}
        <h3 className="text-xl font-bold text-foreground mb-1">
          {member.name}
        </h3>

        {/* Role/Title - For agents, show role by default and file link on hover */}
        {isAIAgent(member) ? (
          <div className="text-sm font-medium mb-3 relative h-5">
            {/* Role - visible by default, hidden on group hover */}
            <span
              className="absolute inset-0 group-hover:opacity-0 transition-opacity"
              style={{ color: member.color }}
            >
              {member.role}
            </span>
            {/* File link - hidden by default, visible on group hover */}
            <a
              href={`https://github.com/edspencer/brag-ai/blob/main/.claude/agents/${member.file}`}
              target="_blank"
              rel="noopener noreferrer"
              className="absolute inset-0 opacity-0 group-hover:opacity-100 hover:underline transition-opacity"
              style={{ color: member.color }}
            >
              {member.file}
            </a>
          </div>
        ) : (
          <p
            className="text-sm font-medium mb-3"
            style={{ color: member.color }}
          >
            {member.role}
          </p>
        )}

        {/* Description */}
        <p className="text-sm text-muted-foreground mb-3 leading-relaxed">
          {member.description}
        </p>

        {/* Quirky Fact */}
        <p className="text-xs italic text-muted-foreground/70">
          {member.quirkyFact}
        </p>
      </div>
    </div>
  );
}
