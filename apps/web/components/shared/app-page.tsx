export const AppPage = ({
  title,
  description,
  children,
}: {
  title?: string;
  description?: string;
  children: React.ReactNode;
}) => {
  // Sidebar is now provided at the layout level
  return <>{children}</>;
};
