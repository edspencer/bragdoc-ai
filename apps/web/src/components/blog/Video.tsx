
import Link from 'next/link';
import CaptionedContent from './CaptionedContent';

export type FigureProps = {
  className?: string;
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
  src,
  caption,
  alt,
  width = 930,
  height = 600,
  href,
  target,
}: FigureProps) {
  return (
    <CaptionedContent className={className} caption={caption}>
      <div className="flex justify-center">
        <Link href={href || src} target={target}>
          <video autoPlay loop muted playsInline>
            <source src={src} type="video/mp4" />
            Your browser does not support the video tag.
          </video>
        </Link>
      </div>
    </CaptionedContent>
  );
}
