'use client';

import { X } from 'lucide-react';
import Image from 'next/image';

interface ImageLightboxProps {
  src: string;
  alt: string;
  onClose: () => void;
}

export function ImageLightbox({ src, alt, onClose }: ImageLightboxProps) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={onClose}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          onClose();
        }
      }}
      role="dialog"
      aria-modal="true"
      aria-label="Image lightbox"
    >
      {/* Close button */}
      <button
        type="button"
        onClick={onClose}
        className="absolute top-4 right-4 z-10 p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors focus:outline-none focus:ring-2 focus:ring-white"
        aria-label="Close lightbox"
      >
        <X className="size-6 text-white" />
      </button>

      {/* Image - clicking it also closes the lightbox */}
      <Image
        src={src}
        alt={alt}
        width={1920}
        height={1080}
        className="object-contain max-w-[95vw] max-h-[95vh] cursor-pointer animate-in zoom-in-95 fade-in duration-200"
        priority
      />
    </div>
  );
}
