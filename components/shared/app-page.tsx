import { PageHeader } from './page-header';

export const AppPage = ({
  children,
  title,
  description,
}: {
  children: React.ReactNode;
  title: string;
  description: string;
}) => {
  return (
    <div className="container mx-auto px-4 py-8">
      {title && description && (
        <PageHeader title={title} description={description} />
      )}
      <div className="space-y-4">{children}</div>
    </div>
  );
};
