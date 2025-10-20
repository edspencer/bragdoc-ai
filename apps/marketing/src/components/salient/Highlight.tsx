export function Highlight({ children }: { children: React.ReactNode }) {
  return (
    <span className="text-blue-600 dark:text-blue-400 font-bold">
      {children}
    </span>
  );
}
