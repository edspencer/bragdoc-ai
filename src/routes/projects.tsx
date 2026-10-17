import { createFileRoute } from '@tanstack/react-router';
import { PageTitle } from '../kit/index.ts';
import { Placeholder } from '../shell/Placeholder.tsx';

export const Route = createFileRoute('/projects')({ component: Projects });

function Projects() {
  return (
    <div data-testid="projects-page">
      <PageTitle sub="What you worked on, when, and for whom.">Projects</PageTitle>
      <Placeholder tape="#3b6cf6">
        Your projects on a timeline, each in a tape colour of your choosing, grouped by company, with the repos they
        live in.
      </Placeholder>
    </div>
  );
}
