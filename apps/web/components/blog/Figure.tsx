import Image from 'next/image';
import Link from 'next/link';
import CaptionedContent from './CaptionedContent';

export type FigureProps = {
  className?: string;
  imageClassName?: string;
  src: string;
  caption?: string;
  alt?: string;
  width?: number;
  height?: number;
  href?: string;
  target?: string;
};

export default function Figure({
  className = '',
  imageClassName = 'rounded-md',
  src,
  caption,
  alt,
  width = 930,
  height = 600,
  href,
  target,
}: FigureProps) {
  return (
    <CaptionedContent className={className} caption={caption} href={href}>
      <div className="flex justify-center">
        <Link href={href || src} target={target}>
          <Image
            className={imageClassName}
            src={src}
            width={width}
            height={height}
            alt={alt ?? caption ?? ''}
          />
        </Link>
      </div>
    </CaptionedContent>
  );
}
