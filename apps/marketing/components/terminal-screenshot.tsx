import Image from 'next/image';

interface TerminalScreenshotProps {
  src: string;
  alt: string;
  width?: number;
  height?: number;
}

export function TerminalScreenshot({
  src,
  alt,
  width = 1200,
  height = 800,
}: TerminalScreenshotProps) {
  return (
    <div className="relative my-4">
      <Image
        src={src}
        alt={alt}
        width={width}
        height={height}
        className="rounded-lg w-full h-auto"
        priority={false}
        quality={90}
      />
    </div>
  );
}
