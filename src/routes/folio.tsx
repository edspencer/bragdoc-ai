import { createFileRoute } from '@tanstack/react-router';
import { PageTitle } from '../kit/index.ts';
import { Placeholder } from '../shell/Placeholder.tsx';

export const Route = createFileRoute('/folio')({ component: Folio });

function Folio() {
  return (
    <div data-testid="folio-page">
      <PageTitle sub="A window of your achievements, ready for review season.">Folio</PageTitle>
      <Placeholder tape="#2fb37e">
        Pick a date range, filter by project or impact, choose what to include, and export it as a markdown document.
      </Placeholder>
    </div>
  );
}
