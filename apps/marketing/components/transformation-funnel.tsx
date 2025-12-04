'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect } from 'react';
import { loginPath } from '@/lib/utils';

// Array of commit messages for animation (aligned with workstreams)
const commitMessages = [
  // Auth-related commits
  'feat: add OAuth providers...',
  'fix: session token expiry',
  'feat: implement JWT auth',
  'test: auth flow coverage',
  'fix: CORS headers issue',
  'feat: add RBAC system',
  'refactor: extract auth middleware',
  'docs: update auth docs',
  // Dashboard-related commits
  'feat: dashboard data models',
  'feat: add edit mode',
  'fix: dashboard state sync',
  'feat: real-time updates via...',
  'test: dashboard edit tests',
  'feat: drag-drop widgets support',
  'fix: widget resize bug',
  // Email-related commits
  'refactor: extract email templates',
  'feat: add email queue',
  'perf: optimize email sending...',
  'feat: email retry logic',
  'test: email delivery tests',
  'docs: email template guide',
  // Cosmetic-related commits
  'style: update brand colors',
  'feat: add dark mode',
  'fix: mobile responsive issues',
  'style: unified typography system',
];

// Workstreams that represent high-level themes
const workstreams = [
  {
    id: 'auth',
    title: 'Authentication Migration',
    color: '#EC4899', // Pink
    achievementCount: 3,
    startDate: new Date('2024-09-09'),
    endDate: new Date('2024-10-22'),
  },
  {
    id: 'dashboard',
    title: 'Editable Dashboard Feature',
    color: '#14B8A6', // Teal
    achievementCount: 3,
    startDate: new Date('2024-09-18'),
    endDate: new Date('2024-10-15'),
  },
  {
    id: 'email',
    title: 'Email Package Refactor',
    color: '#F97316', // Orange
    achievementCount: 3,
    startDate: new Date('2024-09-12'),
    endDate: new Date('2024-09-28'),
  },
  {
    id: 'cosmetic',
    title: 'Cosmetic Improvements',
    color: '#F59E0B', // Amber
    achievementCount: 1,
    startDate: new Date('2024-09-15'),
    endDate: new Date('2024-10-12'),
  },
];

// Array of achievements with impact ratings for animation (chronological order)
const achievementData = [
  {
    date: '9/05',
    title: 'Set up OAuth2 provider integration',
    impact: 2,
    workstreamId: 'auth',
  },
  {
    date: '9/12',
    title: 'Migrated user sessions to JWT',
    impact: 3,
    workstreamId: 'auth',
  },
  {
    date: '9/18',
    title: 'Implemented dashboard data models',
    impact: 2,
    workstreamId: 'dashboard',
  },
  {
    date: '9/22',
    title: 'Added role-based access control',
    impact: 3,
    workstreamId: 'auth',
  },
  {
    date: '9/28',
    title: 'Built dashboard editing interface',
    impact: 3,
    workstreamId: 'dashboard',
  },
  {
    date: '10/02',
    title: 'Extracted email templates to package',
    impact: 2,
    workstreamId: 'email',
  },
  {
    date: '10/05',
    title: 'Added real-time dashboard updates',
    impact: 3,
    workstreamId: 'dashboard',
  },
  {
    date: '10/08',
    title: 'Implemented email queue system',
    impact: 2,
    workstreamId: 'email',
  },
  {
    date: '10/12',
    title: 'Unified brand colors across app',
    impact: 1,
    workstreamId: 'cosmetic',
  },
  {
    date: '10/15',
    title: 'Optimized email sending performance',
    impact: 2,
    workstreamId: 'email',
  },
];

const stages = [
  {
    id: 'commits',
    title: 'Git Commits',
    count: '1000s',
    examples: commitMessages,
    bgColor: '#3B82F6', // blue-500
    textColor: '#FFFFFF',
  },
  {
    id: 'achievements',
    title: 'Achievements',
    count: '100s',
    examples: [
      'Added Better Auth with google & github',
      'Created custom Auth form',
      'Authentication System',
      'Editable Dashboard',
    ],
    bgColor: '#8B5CF6', // purple-500
    textColor: '#FFFFFF',
  },
  {
    id: 'workstreams',
    title: 'Workstreams',
    count: '4',
    examples: workstreams.map((ws) => ws.title),
    bgColor: '#6366F1', // indigo-500
    textColor: '#FFFFFF',
  },
  {
    id: 'documents',
    title: 'Documents',
    count: '3-5',
    examples: [],
    showDocuments: true,
    bgColor: '#10B981', // green-500
    textColor: '#FFFFFF',
  },
];

interface DocumentProps {
  title: string;
  opacity: number;
  x: number;
  y: number;
}

function Document({ title, opacity, x, y }: DocumentProps) {
  return (
    <g transform={`translate(${x}, ${y})`}>
      <rect
        x="-55"
        y="0"
        width="110"
        height="132"
        fill="white"
        opacity={opacity}
        stroke="#9CA3AF"
        strokeWidth="1"
        rx="4"
      />

      {/* Document title */}
      <foreignObject x="-55" y="11" width="110" height="38">
        <div className="text-left pl-3 text-gray-700 font-semibold text-sm leading-tight">
          {title}
        </div>
      </foreignObject>

      {/* Document skeleton lines */}
      <rect x="-44" y="55" width="88" height="4" fill="#10B981" opacity="0.3" />
      <rect x="-44" y="66" width="77" height="3" fill="#10B981" opacity="0.2" />
      <rect x="-44" y="75" width="82" height="3" fill="#10B981" opacity="0.2" />
      <rect x="-44" y="84" width="72" height="3" fill="#10B981" opacity="0.2" />
      <rect x="-44" y="92" width="79" height="3" fill="#10B981" opacity="0.2" />
      <rect
        x="-44"
        y="101"
        width="75"
        height="3"
        fill="#10B981"
        opacity="0.2"
      />
      <rect
        x="-44"
        y="110"
        width="84"
        height="3"
        fill="#10B981"
        opacity="0.2"
      />
      <rect
        x="-44"
        y="119"
        width="77"
        height="3"
        fill="#10B981"
        opacity="0.2"
      />
    </g>
  );
}

interface AnimatedCommitsProps {
  topY: number;
  maxVisible?: number;
  onStarted?: () => void;
}

interface AnimatedAchievementsProps {
  topY: number;
  maxVisible?: number;
  startDelay?: number;
}

interface AnimatedWorkstreamsProps {
  topY: number;
  startDelay?: number;
}

function AnimatedCommits({
  topY,
  maxVisible = 10,
  onStarted,
}: AnimatedCommitsProps) {
  const [visibleCommits, setVisibleCommits] = useState<number[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [hasStarted, setHasStarted] = useState(false);
  const [startDelay] = useState(0); // Start immediately with first text

  // Generate positions for commits
  const generatePosition = (index: number) => {
    const positions = [
      { x: 200, y: topY + 30 },
      { x: 550, y: topY + 40 },
      { x: 350, y: topY + 55 },
      { x: 150, y: topY + 70 },
      { x: 600, y: topY + 75 },
      { x: 450, y: topY + 85 },
      { x: 250, y: topY + 100 },
      { x: 500, y: topY + 110 },
      { x: 300, y: topY + 120 },
      { x: 400, y: topY + 65 },
      { x: 120, y: topY + 95 },
      { x: 620, y: topY + 105 },
      { x: 380, y: topY + 45 },
      { x: 270, y: topY + 80 },
      { x: 520, y: topY + 90 },
    ];
    return positions[index % positions.length];
  };

  useEffect(() => {
    if (!hasStarted) return;

    // Stop if we've shown all commits
    if (currentIndex >= commitMessages.length) return;

    // Add variable delays - slow down towards the end for a softer landing
    const getDelay = () => {
      const remaining = commitMessages.length - currentIndex;
      if (remaining <= 3) return 400; // Last 3 commits come in slower
      if (remaining <= 6) return 300; // Next 3 are medium speed
      return 200; // Normal speed for the rest
    };

    const timeout = setTimeout(() => {
      if (currentIndex < commitMessages.length) {
        setVisibleCommits((prev) => {
          const newCommits = [...prev, currentIndex];
          // Keep only the last maxVisible commits
          if (newCommits.length > maxVisible) {
            return newCommits.slice(-maxVisible);
          }
          return newCommits;
        });
        setCurrentIndex((prev) => prev + 1);
      }
    }, getDelay());

    return () => clearTimeout(timeout);
  }, [currentIndex, hasStarted, maxVisible]);

  // Start animation after delay
  useEffect(() => {
    const timer = setTimeout(() => {
      setHasStarted(true);
      onStarted?.();
    }, startDelay);

    return () => clearTimeout(timer);
  }, [startDelay, onStarted]);

  return (
    <motion.g>
      <AnimatePresence mode="popLayout">
        {visibleCommits.map((commitIndex) => {
          const pos = generatePosition(commitIndex);
          const commit = commitMessages[commitIndex];
          const isOld =
            visibleCommits.indexOf(commitIndex) <
            visibleCommits.length - maxVisible;

          return (
            <motion.text
              key={`commit-${commitIndex}`}
              x={pos.x}
              y={pos.y}
              textAnchor="middle"
              className="fill-white font-mono font-bold"
              style={{ fontSize: '18px' }}
              initial={{ opacity: 0, scale: 0 }}
              animate={{
                opacity: isOld ? 0 : 0.9,
                scale: 1,
              }}
              exit={{
                opacity: 0,
                scale: 0.8,
              }}
              transition={{
                scale: {
                  type: 'spring',
                  stiffness: 200,
                  damping: 15,
                  duration: 0.8,
                },
                opacity: {
                  duration: 0.8,
                  ease: 'easeOut',
                },
              }}
            >
              {commit}
            </motion.text>
          );
        })}
      </AnimatePresence>
    </motion.g>
  );
}

function AnimatedAchievements({
  topY,
  maxVisible = 4,
  startDelay = 2000, // 2 seconds to align with second text
}: AnimatedAchievementsProps) {
  const [visibleAchievements, setVisibleAchievements] = useState<number[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [hasStarted, setHasStarted] = useState(false);
  const [scrollOffset, setScrollOffset] = useState(0);

  // Line height for achievements
  const lineHeight = 30;
  const baseY = topY + 35; // Start near top of purple zone

  // Calculate Y position for each achievement
  const getYPosition = (achievementIndex: number) => {
    const positionInList = visibleAchievements.indexOf(achievementIndex);
    // Position them from top to bottom with lineHeight spacing, then apply scroll
    return baseY + positionInList * lineHeight - scrollOffset;
  };

  // Start after delay
  useEffect(() => {
    const timer = setTimeout(() => {
      setHasStarted(true);
    }, startDelay);

    return () => clearTimeout(timer);
  }, [startDelay]);

  // Add achievements one by one
  useEffect(() => {
    if (!hasStarted) return;

    // Stop if we've shown all achievements
    if (currentIndex >= achievementData.length) return;

    const timeout = setTimeout(() => {
      if (currentIndex < achievementData.length) {
        setVisibleAchievements((prev) => [...prev, currentIndex]);
        setCurrentIndex((prev) => prev + 1);
      }
    }, 400); // 400ms between each achievement (slowed by half)

    return () => clearTimeout(timeout);
  }, [currentIndex, hasStarted]);

  // Handle scrolling animation after 4 achievements are visible
  useEffect(() => {
    // Start scrolling when we have more than 4 achievements
    if (visibleAchievements.length <= maxVisible) return;

    // Calculate how much we need to scroll
    const achievementsBeyondVisible = visibleAchievements.length - maxVisible;
    const targetScroll = achievementsBeyondVisible * lineHeight;

    if (scrollOffset >= targetScroll) return;

    // Linear scroll at constant speed synchronized with appearance rate
    // Achievements appear every 400ms and are 30px apart
    // So we need to scroll 30px per 400ms = 75px per second
    const scrollSpeed = 1.25; // pixels per frame at 60fps (75 pixels per second)

    const scrollInterval = setInterval(() => {
      setScrollOffset((prev) => {
        const newOffset = prev + scrollSpeed;
        if (newOffset >= targetScroll) {
          clearInterval(scrollInterval);
          return targetScroll;
        }
        return newOffset;
      });
    }, 16); // ~60fps

    return () => clearInterval(scrollInterval);
  }, [visibleAchievements.length, maxVisible, scrollOffset]);

  return (
    <g>
      {/* Define clipping path for the purple region */}
      <defs>
        <clipPath id="achievements-clip">
          <rect x="0" y={topY} width="800" height="150" />
        </clipPath>
      </defs>

      <g clipPath="url(#achievements-clip)">
        <AnimatePresence>
          {visibleAchievements.map((achievementIndex) => {
            const achievement = achievementData[achievementIndex];
            const yPosition = getYPosition(achievementIndex);

            return (
              <motion.text
                key={`achievement-${achievementIndex}`}
                x={400}
                y={yPosition}
                textAnchor="middle"
                className="fill-white font-semibold"
                style={{ fontSize: '18px' }}
                initial={{ opacity: 0 }}
                animate={{ opacity: 0.9 }}
                transition={{
                  opacity: {
                    duration: 0.3,
                    ease: 'easeIn',
                  },
                }}
              >
                <tspan className="font-mono opacity-70">
                  {achievement.date}
                </tspan>
                <tspan dx="8">{achievement.title}</tspan>
                <tspan dx="4" className="fill-yellow-500">
                  {Array.from(
                    { length: achievement.impact },
                    (_, _i) => '★',
                  ).join('')}
                </tspan>
              </motion.text>
            );
          })}
        </AnimatePresence>
      </g>
    </g>
  );
}

function AnimatedWorkstreams({
  topY,
  startDelay = 4000, // 4 seconds to align with third text
}: AnimatedWorkstreamsProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [hoveredWorkstream, setHoveredWorkstream] = useState<string | null>(
    null,
  );

  // Calculate timeline range from workstreams
  const timelineStart = new Date('2024-09-01');
  const timelineEnd = new Date('2024-10-31');
  const totalDays =
    (timelineEnd.getTime() - timelineStart.getTime()) / (1000 * 60 * 60 * 24);

  // Sort workstreams by start date (earliest first)
  const sortedWorkstreams = [...workstreams].sort(
    (a, b) => a.startDate.getTime() - b.startDate.getTime(),
  );

  // Calculate position and width for each workstream bar
  const getBarDimensions = (startDate: Date, endDate: Date) => {
    const startOffset =
      (startDate.getTime() - timelineStart.getTime()) / (1000 * 60 * 60 * 24);
    const duration =
      (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24) + 1; // +1 to include end date

    const leftPercent = (startOffset / totalDays) * 100;
    const widthPercent = Math.max((duration / totalDays) * 100, 2); // Minimum 2% width for visibility

    return { left: leftPercent, width: widthPercent };
  };

  // Start after delay
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(true);
    }, startDelay);

    return () => clearTimeout(timer);
  }, [startDelay]);

  if (!isVisible) return null;

  const barHeight = 24;
  const rowHeight = 32;
  const timelineWidth = 520;
  const timelineLeft = 140;
  const baseY = topY + 20; // Moved up by 10 pixels

  return (
    <motion.g
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.6 }}
    >
      {/* Workstream rows */}
      {sortedWorkstreams.map((workstream, sortedIndex) => {
        const { left, width } = getBarDimensions(
          workstream.startDate,
          workstream.endDate,
        );
        // Use original array index for positioning (visual order)
        const originalIndex = workstreams.findIndex(
          (ws) => ws.id === workstream.id,
        );
        const barY = baseY + originalIndex * rowHeight;
        const isHovered = hoveredWorkstream === workstream.id;

        return (
          <motion.g
            key={workstream.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
              delay: sortedIndex * 0.6, // 600ms delay between each workstream
              duration: 0.8, // Twice as slow (was 0.4)
              type: 'spring',
              stiffness: 150,
              damping: 20,
            }}
          >
            {/* Workstream bar */}
            <motion.rect
              x={timelineLeft + (left * timelineWidth) / 100}
              y={barY}
              width={(width * timelineWidth) / 100}
              height={barHeight}
              fill={workstream.color}
              rx="4"
              opacity={isHovered ? 1 : 0.85}
              style={{
                cursor: 'pointer',
                filter: isHovered ? 'brightness(1.1)' : 'none',
              }}
              onMouseEnter={() => setHoveredWorkstream(workstream.id)}
              onMouseLeave={() => setHoveredWorkstream(null)}
              whileHover={{ scale: 1.02 }}
              transition={{ type: 'spring', stiffness: 300, damping: 20 }}
            />

            {/* Workstream title inside bar */}
            <text
              x={
                timelineLeft +
                (left * timelineWidth) / 100 +
                (width * timelineWidth) / 200
              }
              y={barY + barHeight / 2 + 1}
              textAnchor="middle"
              className="fill-white font-bold text-xs pointer-events-none"
              style={{ dominantBaseline: 'middle' }}
            >
              {workstream.title}
            </text>
          </motion.g>
        );
      })}
    </motion.g>
  );
}

function FunnelSVG() {
  const [_commitsStarted, setCommitsStarted] = useState(false);

  return (
    <svg
      viewBox="0 0 800 600"
      className="w-full h-auto"
      preserveAspectRatio="xMidYMid meet"
    >
      {/* Define the funnel segments as trapezoids */}
      {stages.map((stage, index) => {
        // Calculate trapezoid dimensions for each segment
        const totalHeight = 600;
        const segmentHeight = totalHeight / stages.length;
        const topY = index * segmentHeight;
        const bottomY = (index + 1) * segmentHeight;

        // Width calculations - starts wide, narrows down
        const maxWidth = 800; // Use full SVG width
        const minWidth = 150;
        const widthReduction = (maxWidth - minWidth) / stages.length;

        const topWidth = maxWidth - index * widthReduction;
        const bottomWidth = maxWidth - (index + 1) * widthReduction;

        // Center the trapezoids
        const topLeft = (800 - topWidth) / 2;
        const topRight = topLeft + topWidth;
        const bottomLeft = (800 - bottomWidth) / 2;
        const bottomRight = bottomLeft + bottomWidth;

        // Create trapezoid path
        const path = `
          M ${topLeft} ${topY}
          L ${topRight} ${topY}
          L ${bottomRight} ${bottomY}
          L ${bottomLeft} ${bottomY}
          Z
        `;

        return (
          <g key={stage.id}>
            {/* Segment background */}
            <path
              d={path}
              fill={stage.bgColor}
              opacity="0.9"
              stroke="white"
              strokeWidth="2"
            />

            {/* Segment title and count - hide for commits, achievements, and workstreams sections */}
            {!stage.showDocuments &&
              stage.id !== 'commits' &&
              stage.id !== 'achievements' &&
              stage.id !== 'workstreams' && (
                <>
                  <text
                    x="400"
                    y={topY + 35}
                    textAnchor="middle"
                    className="fill-white font-bold text-xl"
                  >
                    {stage.title}
                  </text>
                  <text
                    x="400"
                    y={topY + 55}
                    textAnchor="middle"
                    className="fill-white/80 text-sm"
                  >
                    ({stage.count})
                  </text>
                </>
              )}

            {/* Examples content */}
            {stage.showDocuments ? (
              // Stacked documents for the Documents section
              <g transform={`translate(410, ${topY + 45})`}>
                {/* Back document (Performance Review) - appears first */}
                <motion.g
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.6, delay: 6 }}
                >
                  <Document
                    title="Performance Review"
                    opacity={0.7}
                    x={-22}
                    y={-22}
                  />
                </motion.g>

                {/* Middle document (Monthly Report) - appears second */}
                <motion.g
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.6, delay: 6.7 }}
                >
                  <Document
                    title="Monthly Report"
                    opacity={0.9}
                    x={-11}
                    y={-11}
                  />
                </motion.g>

                {/* Front document (Weekly Report) - appears third */}
                <motion.g
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.6, delay: 7.4 }}
                >
                  <Document title="Weekly Report" opacity={0.97} x={0} y={0} />
                </motion.g>
              </g>
            ) : stage.id === 'commits' ? (
              // Animated commit messages for commits section
              <AnimatedCommits
                topY={topY}
                maxVisible={10}
                onStarted={() => setCommitsStarted(true)}
              />
            ) : stage.id === 'achievements' ? (
              // Animated achievements for achievements section
              <AnimatedAchievements
                topY={topY}
                maxVisible={4}
                startDelay={2000}
              />
            ) : stage.id === 'workstreams' ? (
              // Animated Gantt chart for workstreams section
              <AnimatedWorkstreams topY={topY} startDelay={4000} />
            ) : null}
          </g>
        );
      })}
    </svg>
  );
}

export function TransformationFunnel() {
  return (
    <div className="py-20 bg-gradient-to-b from-gray-50 to-white">
      <div className="container mx-auto px-3 md:px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <h2 className="text-4xl font-bold text-gray-900 mb-4">
            From Code to Career Documentation
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            BragDoc intelligently transforms your daily work into powerful
            professional documentation
          </p>
        </motion.div>

        <div className="max-w-6xl mx-auto">
          {/* Desktop layout (md and above) */}
          <div className="hidden md:flex items-stretch gap-0">
            {/* SVG Funnel */}
            <div className="flex-3 relative flex">
              <FunnelSVG />
            </div>

            {/* Right-side descriptions */}
            <div className="flex-2 flex flex-col">
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5, delay: 0.3 }}
                className="flex-1 flex items-center justify-center text-center"
              >
                <p className="text-3xl font-medium text-gray-700 whitespace-nowrap">
                  Thousands of <span style={{ color: '#3B82F6' }}>Commits</span>
                </p>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5, delay: 2.3 }}
                className="flex-1 flex items-center justify-center text-center"
                style={{ marginLeft: '-10%' }}
              >
                <p className="text-3xl font-medium text-gray-700">
                  are extracted into hundreds of{' '}
                  <span style={{ color: '#8B5CF6' }}>Achievements</span>
                </p>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5, delay: 4.3 }}
                className="flex-1 flex items-center justify-center text-center"
                style={{ marginLeft: '-20%' }}
              >
                <p className="text-3xl font-medium text-gray-700 whitespace-nowrap">
                  auto-categorized into{' '}
                  <span style={{ color: '#6366F1' }}>Workstreams</span>
                </p>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5, delay: 6.3 }}
                className="flex-1 flex items-center justify-center text-center"
                style={{ marginLeft: '-30%' }}
              >
                <p className="text-3xl font-medium text-gray-700">
                  and turned into{' '}
                  <span style={{ color: '#10B981' }}>Documents</span> to power
                  your performance reviews
                </p>
              </motion.div>
            </div>
          </div>

          {/* Mobile layout (below md) */}
          <div className="md:hidden">
            <div className="w-full">
              <FunnelSVG />
            </div>

            {/* Mobile text descriptions below funnel */}
            <div className="mt-8 space-y-4 px-4">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: 0.1 }}
                className="text-center"
              >
                <p className="text-xl font-medium text-gray-700">
                  Thousands of <span style={{ color: '#3B82F6' }}>Commits</span>{' '}
                  are extracted into hundreds of{' '}
                  <span style={{ color: '#8B5CF6' }}>Achievements</span>,
                  auto-categorized into{' '}
                  <span style={{ color: '#6366F1' }}>Workstreams</span>, and
                  turned into{' '}
                  <span style={{ color: '#10B981' }}>Documents</span> to power
                  your performance reviews
                </p>
              </motion.div>
            </div>
          </div>
        </div>

        {/* Bottom CTA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="text-center mt-16"
        >
          <p className="text-lg text-gray-600 mb-6">
            Transform thousands of commits into meaningful career documentation
          </p>
          <a
            href={loginPath()}
            className="inline-flex items-center justify-center px-8 py-3 text-base font-medium text-white bg-blue-600 border border-transparent rounded-lg hover:bg-blue-700 transition-colors"
          >
            Start Your Transformation
          </a>
        </motion.div>
      </div>
    </div>
  );
}
