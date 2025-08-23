import clsx from 'clsx';

export default function Quote({
  className = '',
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return <aside className={clsx(className, 'pullquote')}>{children}</aside>;
}
