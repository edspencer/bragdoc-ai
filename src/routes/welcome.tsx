// First run (SPEC R10). The shell shows this page without its header and tabs. PR16 builds the steps.
import { createFileRoute } from '@tanstack/react-router';
import { Hand, LinkBtn } from '../kit/index.ts';
import { Mark, Wordmark } from '../shell/Logo.tsx';
import { Placeholder } from '../shell/Placeholder.tsx';

export const Route = createFileRoute('/welcome')({ component: Welcome });

function Welcome() {
  return (
    <div data-testid="welcome-page" className="mx-auto max-w-3xl px-4 pb-16 pt-10 sm:px-6">
      <div className="flex items-center gap-2">
        <Mark />
        <Wordmark />
      </div>
      <h1 className="m-0 mt-10 font-grotesk text-[40px] font-extrabold leading-none tracking-tight sm:text-[52px]">Welcome.</h1>
      <Hand rotate={-2} className="mt-2 text-[24px] text-accent">
        Let&apos;s set up your board.
      </Hand>
      <Placeholder tape="#ef5a3c">
        A few skippable steps: about you, where wins come from, and your code. Everything stays on this computer.
      </Placeholder>
      <div className="mt-8 flex justify-end">
        <LinkBtn to="/" kind="accent">
          Go to the board →
        </LinkBtn>
      </div>
    </div>
  );
}
