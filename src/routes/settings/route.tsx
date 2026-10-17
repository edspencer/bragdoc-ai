// Settings' frame (SPEC R13): the title and the notebook-divider tabs, with the current tab's page beside them.
import { Outlet, createFileRoute } from '@tanstack/react-router';
import { NotebookTab, NotebookTabs, PageTitle } from '../../kit/index.ts';
import { SETTINGS_TABS } from '../../shell/nav.ts';

export const Route = createFileRoute('/settings')({ component: SettingsFrame });

function SettingsFrame() {
  return (
    <div data-testid="settings-page">
      <PageTitle sub="Everything BragDoc does by itself, and everything it talks to, is decided here.">Settings</PageTitle>
      <div className="mt-8 grid items-start gap-6 lg:grid-cols-[220px_minmax(0,1fr)] lg:gap-8">
        <NotebookTabs label="Settings">
          {SETTINGS_TABS.map((t) => (
            <NotebookTab key={t.id} to="/settings/$tab" params={{ tab: t.id }} color={t.color}>
              {t.label}
            </NotebookTab>
          ))}
        </NotebookTabs>
        <div className="min-w-0">
          <Outlet />
        </div>
      </div>
    </div>
  );
}
