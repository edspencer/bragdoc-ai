import { SidebarToggle } from '../sidebar-toggle';
import { PageHeader } from './page-header';
import { BetaBanner } from 'components/BetaBanner';

export const AppPage = ({
  children,
  title,
  description,
}: {
  children: React.ReactNode;
  title?: string;
  description?: string;
}) => {
  return (
    <>
      <BetaBanner />
      <header className="flex sticky top-0 bg-background py-1.5 items-center px-2 md:px-2 gap-2">
        <SidebarToggle />
      </header>
      <div className="container mx-auto sm:px-4 sm:py-8 px-2 py-4">
        {title && description && (
          <PageHeader title={title} description={description} />
        )}
        <div className="space-y-4">{children}</div>
      </div>
    </>
  );
};
