import type React from 'react';
import { Card, CardContent } from '@/components/ui/card';

export function PathBSteps() {
  return (
    <Card>
      <CardContent className="p-6 sm:p-8">
        <div className="space-y-8">
          <StepItem number={1} title="Sign Up" time="1 minute">
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>• Visit app.bragdoc.ai/register</li>
              <li>• Choose Google/GitHub/Email</li>
              <li>• Confirm email (if email signup)</li>
            </ul>
          </StepItem>

          <StepItem number={2} title="Create Company" time="30 seconds">
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>• Click "Add Company"</li>
              <li>• Enter company name, employment dates</li>
              <li>• Save</li>
            </ul>
          </StepItem>

          <StepItem number={3} title="Create Project" time="30 seconds">
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>• Click "Add Project"</li>
              <li>• Enter project name, link to company</li>
              <li>• Choose color, save</li>
            </ul>
          </StepItem>

          <StepItem number={4} title="Add First Achievement" time="1 minute">
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>• Click "Add Achievement"</li>
              <li>• Enter title, description</li>
              <li>• Rate impact (1-10 stars)</li>
              <li>• Link to project, save</li>
            </ul>
          </StepItem>

          <StepItem number={5} title="Explore" time="2 minutes">
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>• Browse achievements</li>
              <li>• Generate first document</li>
              <li>• Explore analytics</li>
            </ul>
          </StepItem>
        </div>
      </CardContent>
    </Card>
  );
}

function StepItem({
  number,
  title,
  time,
  children,
}: {
  number: number;
  title: string;
  time: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex gap-4 sm:gap-6">
      <div className="flex-shrink-0">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-primary-foreground font-bold text-lg">
          {number}
        </div>
      </div>
      <div className="flex-1 space-y-3">
        <div className="flex items-center gap-3 mb-2">
          <h3 className="text-lg font-semibold">{title}</h3>
          <span className="text-sm text-muted-foreground">({time})</span>
        </div>
        {children}
      </div>
    </div>
  );
}
