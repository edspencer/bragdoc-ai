'use client';

import { cn } from 'lib/utils';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from 'components/ui/card';
import { AnimatePresence, motion } from 'framer-motion';

export interface WelcomeCardProps {
  title: string;
  description: string;
  image?: string;
  demo?: React.ReactNode;
  isActive?: boolean;
  className?: string;
}

export function WelcomeCard({
  title,
  description,
  image,
  demo,
  isActive = false,
  className,
}: WelcomeCardProps) {
  return (
    <AnimatePresence>
      {isActive && (
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{
            duration: 0.3,
            ease: 'easeInOut',
          }}
          className={cn('w-full', className)}
          key={title}
        >
          <Card className="h-full">
            <CardHeader>
              <CardTitle>{title}</CardTitle>
              <CardDescription>{description}</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col items-center justify-center gap-6">
              {image && (
                <div className="w-full overflow-hidden rounded-lg aspect-video">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={image}
                    alt={title}
                    className="object-cover size-full"
                  />
                </div>
              )}
              {demo && <div className="w-full">{demo}</div>}
            </CardContent>
          </Card>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
