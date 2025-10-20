'use client';

import * as React from 'react';
import { Badge } from 'components/ui/badge';
import { Button } from 'components/ui/button';
import { Card } from 'components/ui/card';
import { BuildingIcon, FolderIcon, PlusIcon } from 'lucide-react';
import { motion } from 'framer-motion';

const EXAMPLE_COMPANIES = [
  { id: 1, name: 'Acme Corp' },
  { id: 2, name: 'Startup Inc' },
];

const EXAMPLE_PROJECTS = [
  { id: 1, name: 'Dashboard Redesign', companyId: 1 },
  { id: 2, name: 'API Migration', companyId: 1 },
  { id: 3, name: 'Mobile App', companyId: 2 },
];

export function ProjectDemo() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-2">
          <BuildingIcon className="size-4" />
          <h4 className="text-sm font-medium">Companies</h4>
          <Badge variant="outline" className="ml-auto">
            Optional
          </Badge>
        </div>
        <div className="grid gap-2">
          {EXAMPLE_COMPANIES.map((company, index) => (
            <motion.div
              key={company.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.2 }}
            >
              <Card className="p-3">
                <div className="flex items-center gap-2">
                  <BuildingIcon className="size-4 text-muted-foreground" />
                  <span className="text-sm">{company.name}</span>
                </div>
              </Card>
            </motion.div>
          ))}
          <Button variant="outline" className="gap-2" size="sm">
            <PlusIcon className="size-4" />
            Add Company
          </Button>
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-2">
          <FolderIcon className="size-4" />
          <h4 className="text-sm font-medium">Projects</h4>
          <Badge variant="outline" className="ml-auto">
            Optional
          </Badge>
        </div>
        <div className="grid gap-2">
          {EXAMPLE_PROJECTS.map((project, index) => (
            <motion.div
              key={project.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.2 + 0.4 }}
            >
              <Card className="p-3">
                <div className="flex items-center gap-2">
                  <FolderIcon className="size-4 text-muted-foreground" />
                  <span className="text-sm">{project.name}</span>
                  <Badge variant="secondary" className="ml-auto">
                    {
                      EXAMPLE_COMPANIES.find((c) => c.id === project.companyId)
                        ?.name
                    }
                  </Badge>
                </div>
              </Card>
            </motion.div>
          ))}
          <Button variant="outline" className="gap-2" size="sm">
            <PlusIcon className="size-4" />
            Add Project
          </Button>
        </div>
      </div>
    </div>
  );
}
