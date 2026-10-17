import { createFileRoute } from '@tanstack/react-router';
import { useHealth } from '../api/queries.ts';
import { Dot, PageTitle } from '../kit/index.ts';
import { Placeholder } from '../shell/Placeholder.tsx';

export const Route = createFileRoute('/')({ component: Board });

function Board() {
  const health = useHealth();
  return (
    <div data-testid="board-page">
      <PageTitle sub="Your achievements, pinned up week by week, with the evidence that backs them up.">Board</PageTitle>
      <Placeholder tape="#ef5a3c" testId="placeholder-shell">
        <p className="m-0">
          This is where your board goes: paste a screenshot, drop a PDF or a PR link, or write a line, and it&apos;s pinned
          here. BragDoc v0.1 is being built one piece at a time; this page arrives in a later pull request.
        </p>
        <p className="m-0 mt-4 flex items-center gap-2 font-mono text-[13px] text-ink" data-testid="server-status">
          {health.isPending ? (
            <>
              <Dot tone="off" /> Checking the server…
            </>
          ) : health.isError ? (
            <>
              <Dot tone="bad" /> The server is not answering.
            </>
          ) : (
            <>
              <Dot tone="good" /> Server OK, version {health.data.version}
            </>
          )}
        </p>
      </Placeholder>
    </div>
  );
}
