import { cookies } from 'next/headers';

import { SettingsNav } from '@/components/settings-nav';

import { auth } from '../../(auth)/auth';

export const experimental_ppr = true;

export default function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col md:flex-row md:gap-12">
      <aside className="md:w-48 p-6 md:p-8">
        <SettingsNav />
      </aside>
      <main className="flex-1">{children}</main>
    </div>
  );
}
