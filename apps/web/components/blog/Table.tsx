import clsx from 'clsx';

export default function Table({
  headings = [],
  children,
}: {
  headings: string[];
  children: React.ReactNode;
}) {
  return (
    <table className="table-auto w-full">
      <thead>
        <TableRow>
          {headings.map((heading) => (
            <TableHead key={heading}>{heading}</TableHead>
          ))}
        </TableRow>
      </thead>
      <tbody>{children}</tbody>
    </table>
  );
}

export function TableCell({
  children,
  className = '',
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <td className={clsx('border-b dark:border-slate-600 py-2', className)}>
      {children}
    </td>
  );
}

export function TableRow({ children }: { children: React.ReactNode }) {
  return <tr>{children}</tr>;
}

export function TableHead({ children }: { children: React.ReactNode }) {
  return (
    <th className="border-b dark:border-slate-600 font-medium text-slate-800 dark:text-slate-200 text-left">
      {children}
    </th>
  );
}
