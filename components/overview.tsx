import { motion } from 'framer-motion';
import type { User } from 'next-auth';
import { useState } from 'react';
import { mutate } from 'swr';

import { useNavCounts } from "@/hooks/use-nav-counts";
import { CompanyDialog } from '@/components/companies/company-dialog';
import { ProjectDialog } from '@/components/projects/project-dialog';
import { Button } from '@/components/ui/button';

export const Overview = ({ user }: { user: User | null | undefined }) => {
  const { counts } = useNavCounts();
  const [companyDialogOpen, setCompanyDialogOpen] = useState(false);
  const [projectDialogOpen, setProjectDialogOpen] = useState(false);

  const hasCompanies = counts.companies > 0;
  const hasProjects = counts.projects > 0;

  const handleCompanySubmit = async (data: any) => {
    try {
      await fetch('/api/companies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      await mutate('/api/counts');
      setCompanyDialogOpen(false);
    } catch (error) {
      console.error('Failed to create company:', error);
    }
  };

  const handleProjectSubmit = async (data: any) => {
    try {
      await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      await mutate('/api/counts');
      setProjectDialogOpen(false);
    } catch (error) {
      console.error('Failed to create project:', error);
    }
  };

  return (
    <motion.div
      key="overview"
      className="max-w-3xl mx-auto md:mt-20"
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.98 }}
      transition={{ delay: 0.5 }}
    >
      <div className="rounded-xl p-6 flex flex-col gap-8 leading-relaxed text-center max-w-xl mx-auto">
        {hasCompanies && hasProjects
          ? <p>Welcome back, what can I do for you today?</p>
          : <p>Let's get started! Usually you'll want to track achievements for a company and a project.</p>}
        
        <div className="flex gap-12 items-center justify-center">
          {!hasCompanies && (
            <Button variant='ghost' className='border rounded-xl px-20 py-8' onClick={() => setCompanyDialogOpen(true)}>
              Add my Company
            </Button>
          )}
          
          {!hasProjects && (
            <Button variant='ghost' className='border rounded-xl px-20 py-8' onClick={() => setProjectDialogOpen(true)}>
              Add my Project
            </Button>
          )}
        </div>

        {!(hasCompanies && hasProjects) && (
          <p>
            Or, just tell me what you've achieved lately and I'll track it for you:
          </p>
        )}
      </div>

      <CompanyDialog
        open={companyDialogOpen}
        onOpenChange={setCompanyDialogOpen}
        onSubmit={handleCompanySubmit}
        mode="create"
      />

      <ProjectDialog
        open={projectDialogOpen}
        onOpenChange={setProjectDialogOpen}
        onSubmit={handleProjectSubmit}
        companies={[]}
      />
    </motion.div>
  );
};
