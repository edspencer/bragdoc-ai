// One settings tab (SPEC R13). An unknown tab is the not-found page. Each tab's page is in src/settings/.
import { createFileRoute, notFound } from '@tanstack/react-router';
import { isSettingsTab, type SettingsTab } from '../../shell/nav.ts';
import { AboutTab } from '../../settings/AboutTab.tsx';
import { DataTab } from '../../settings/DataTab.tsx';
import { NetworkTab } from '../../settings/NetworkTab.tsx';
import { SourcesTab } from '../../settings/SourcesTab.tsx';

export const Route = createFileRoute('/settings/$tab')({
  beforeLoad: ({ params }) => {
    if (!isSettingsTab(params.tab)) throw notFound();
  },
  component: SettingsTabPage,
});

const TABS: Record<SettingsTab, () => React.JSX.Element> = {
  sources: SourcesTab,
  network: NetworkTab,
  data: DataTab,
  about: AboutTab,
};

function SettingsTabPage() {
  const { tab } = Route.useParams();
  const Tab = TABS[tab as SettingsTab];
  return <Tab />;
}
