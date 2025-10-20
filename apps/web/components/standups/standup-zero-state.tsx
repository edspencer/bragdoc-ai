'use client';

import { useState } from 'react';
import { Button } from 'components/ui/button';
import { StandupForm } from './standup-form';
import { useRouter } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';

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
          className="flex flex-1 flex-col p-4 md:p-6 justify-center"
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
          className="flex flex-1 flex-col items-center justify-center p-8"
        >
          <div className="max-w-2xl text-center space-y-6">
            <h1 className="text-3xl font-bold">Daily Standup Updates</h1>
            <p className="text-lg text-muted-foreground">
              Prepares your standup update for you based on what you&apos;ve got
              done and what&apos;s in progress
            </p>
            <Button size="lg" onClick={() => setShowForm(true)}>
              Get Started
            </Button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
