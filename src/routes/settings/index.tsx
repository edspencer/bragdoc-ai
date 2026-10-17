// `/settings` opens the first tab.
import { createFileRoute, redirect } from '@tanstack/react-router';
import { SETTINGS_TABS } from '../../shell/nav.ts';

export const Route = createFileRoute('/settings/')({
  beforeLoad: () => {
    throw redirect({ to: '/settings/$tab', params: { tab: SETTINGS_TABS[0].id }, replace: true });
  },
});
