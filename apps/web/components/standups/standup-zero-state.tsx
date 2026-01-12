'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { IconUsers, IconPlus } from '@tabler/icons-react';
import { AnimatePresence, motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { PageZeroState } from '@/components/shared/page-zero-state';
import { StandupForm } from './standup-form';

export function StandupZeroState() {
  const [showForm, setShowForm] = useState(false);
  const router = useRouter();

  const handleSuccess = () => {
    // Refresh the page to show the standup
    router.refresh();
  };

  return (
    <AnimatePresence mode="wait">
      {showForm ? (
        <motion.div
          key="form"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.1 }}
          className="flex flex-1 flex-col p-4 md:p-6"
        >
          <div className="max-w-3xl mx-auto w-full space-y-6">
            <div>
              <h1 className="text-3xl font-bold">Create Your Standup</h1>
              <p className="text-muted-foreground mt-2">
                Set up your daily standup configuration
              </p>
            </div>
            <StandupForm
              onSuccess={handleSuccess}
              onCancel={() => setShowForm(false)}
            />
          </div>
        </motion.div>
      ) : (
        <motion.div
          key="zero-state"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.1 }}
        >
          <PageZeroState
            icon={<IconUsers className="h-6 w-6 text-primary" />}
            title="Daily Standup Updates"
          >
            <p className="text-muted-foreground text-center">
              Automatically prepares your standup update based on what
              you&apos;ve accomplished and what&apos;s in progress.
            </p>
            <div className="text-center">
              <Button size="lg" onClick={() => setShowForm(true)}>
                <IconPlus className="size-4 mr-2" />
                Get Started
              </Button>
            </div>
          </PageZeroState>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
