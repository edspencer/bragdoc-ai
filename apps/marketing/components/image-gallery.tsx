'use client';

import Image from 'next/image';
import { ImageLightbox } from './image-lightbox';
import { useImageLightbox } from '@/hooks/use-image-lightbox';

interface ImageGalleryProps {
  images: Array<{
    src: string;
    alt: string;
  }>;
  height?: number;
  gap?: number;
}

export function ImageGallery({
  images,
  height = 300,
  gap = 8,
}: ImageGalleryProps) {
  const { lightboxImage, openLightbox, closeLightbox } = useImageLightbox();
  const gapClass =
    {
      2: 'gap-2',
      3: 'gap-3',
      4: 'gap-4',
      6: 'gap-6',
      8: 'gap-8',
    }[gap] || 'gap-4';

  return (
    <>
      {/* Desktop: horizontal flex layout, Mobile: vertical flex layout */}
      <div
        className={`not-prose my-8 flex flex-col lg:flex-row items-center justify-center ${gapClass}`}
      >
        {images.map((image, index) => (
          <button
            key={index}
            type="button"
            onClick={() => openLightbox(image.src, image.alt)}
            className="relative inline-block rounded-lg overflow-hidden shadow-lg hover:shadow-xl transition-shadow cursor-pointer focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
            style={{ height: `${height}px`, aspectRatio: '4/3' }}
            aria-label={`View full size: ${image.alt}`}
          >
            <Image
              src={image.src}
              alt={image.alt}
              fill
              className="object-cover hover:scale-105 transition-transform duration-200"
              sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
            />
          </button>
        ))}
      </div>

      {/* Lightbox modal */}
      {lightboxImage && (
        <ImageLightbox
          src={lightboxImage.src}
          alt={lightboxImage.alt}
          onClose={closeLightbox}
        />
      )}
    </>
  );
}
