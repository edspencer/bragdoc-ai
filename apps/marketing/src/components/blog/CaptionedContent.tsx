import clsx from 'clsx';

export default function CaptionedContent({
  children,
  caption,
  className = '',
  href,
}: {
  children: React.ReactNode;
  caption?: string;
  className?: string;
  href?: string;
}) {
  const linkedCaption = href ? (
    <a href={href} target="_blank" rel="noopener noreferrer">
      {caption}
    </a>
  ) : (
    caption
  );

  return (
    <figure className={clsx('my-6', className)}>
      {children}
      {caption ? (
        <figcaption className="text-sm text-gray-500 text-center italic pt-2">
          {linkedCaption}
        </figcaption>
      ) : null}
    </figure>
  );
}
