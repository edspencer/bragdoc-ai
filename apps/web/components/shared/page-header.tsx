interface PageHeaderProps {
  title: string;
  description?: string | React.ReactNode;
  className?: string;
  children?: React.ReactNode;
}

export function PageHeader({
  title,
  description,
  className,
  children,
}: PageHeaderProps) {
  return (
    <div className={className}>
      <h1 className="text-3xl font-bold tracking-tight">{title}</h1>
      {description && (
        <p className="mt-2 text-muted-foreground">{description}</p>
      )}
    </div>
  );
}

export function CRUDHeader({ title, description, children }: PageHeaderProps) {
  return (
    <div className="mb-4 flex flex-col sm:flex-row justify-start items-start sm:align-bottom sm:justify-between sm:items-end gap-4">
      <PageHeader title={title} description={description} />
      {children}
    </div>
  );
}
