// One settings tab. An unknown tab is the not-found page. PR10 builds Network activity, Data and About & verify;
// the Sources tab's cards come with their sources (PR9's agents card, PR13 GitHub, PR15 screenshots).
import { createFileRoute, notFound } from '@tanstack/react-router';
import { SectionTitle } from '../../kit/index.ts';
import { Placeholder } from '../../shell/Placeholder.tsx';
import { SETTINGS_TABS, isSettingsTab, type SettingsTab } from '../../shell/nav.ts';

export const Route = createFileRoute('/settings/$tab')({
  beforeLoad: ({ params }) => {
    if (!isSettingsTab(params.tab)) throw notFound();
  },
  component: SettingsTabPage,
});

const ABOUT: Record<SettingsTab, { sub: string; soon: string }> = {
  sources: {
    sub: 'Each source collects candidates on its own and drops them into Found. Nothing reaches your board until you keep it.',
    soon: 'GitHub, a screenshots folder, and your coding agents over MCP. Each one is off until you turn it on.',
  },
  network: {
    sub: 'Every request BragDoc makes to another computer, and what it is allowed to talk to.',
    soon: 'A receipt of every outbound request, and the allow-list that decides them. Nothing goes to BragDoc’s makers.',
  },
  data: {
    sub: 'Your data is plain files in a folder on this computer.',
    soon: 'Where your data folder is, its backups, any files BragDoc couldn’t read, and importing from the hosted app.',
  },
  about: {
    sub: 'Which version this is, and how to check it was built from the public source.',
    soon: 'Build details, and the commands that verify this package’s signatures and provenance yourself.',
  },
};

function SettingsTabPage() {
  const { tab } = Route.useParams();
  const t = SETTINGS_TABS.find((x) => x.id === tab)!;
  const about = ABOUT[t.id];
  return (
    <div data-testid={`settings-${t.id}`}>
      <SectionTitle sub={about.sub}>{t.label}</SectionTitle>
      <Placeholder tape={t.color}>{about.soon}</Placeholder>
    </div>
  );
}
