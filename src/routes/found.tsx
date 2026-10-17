import { createFileRoute } from '@tanstack/react-router';
import { PageTitle } from '../kit/index.ts';
import { Placeholder } from '../shell/Placeholder.tsx';

export const Route = createFileRoute('/found')({ component: Found });

function Found() {
  return (
    <div data-testid="found-page">
      <PageTitle sub="Things your sources spotted by themselves. Nothing goes on your board until you say so.">Found</PageTitle>
      <Placeholder tape="#e9961a">
        Merged pull requests and praise in your screenshots will wait here for a yes or no: keep, merge into an
        achievement, or dismiss.
      </Placeholder>
    </div>
  );
}
