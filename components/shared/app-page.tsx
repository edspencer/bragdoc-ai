import { SidebarToggle } from '../sidebar-toggle';
import { PageHeader } from './page-header';

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
      <header className="flex sticky top-0 bg-background py-1.5 items-center px-2 md:px-2 gap-2">
        <SidebarToggle />
      </header>
      <div className="container mx-auto px-4 py-8">
        {title && description && (
          <PageHeader title={title} description={description} />
        )}
        <div className="space-y-4">{children}</div>
      </div>
    </>
  );
};
