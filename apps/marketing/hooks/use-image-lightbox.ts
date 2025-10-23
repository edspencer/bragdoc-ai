'use client';

import { useState, useEffect } from 'react';

interface LightboxImage {
  src: string;
  alt: string;
}

export function useImageLightbox() {
  const [lightboxImage, setLightboxImage] = useState<LightboxImage | null>(
    null,
  );

  // Handle Escape key to close lightbox
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && lightboxImage) {
        setLightboxImage(null);
      }
    };

    if (lightboxImage) {
      document.addEventListener('keydown', handleEscape);
      // Prevent body scroll when lightbox is open
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [lightboxImage]);

  const openLightbox = (src: string, alt: string) => {
    setLightboxImage({ src, alt });
  };

  const closeLightbox = () => {
    setLightboxImage(null);
  };

  return {
    lightboxImage,
    openLightbox,
    closeLightbox,
    isOpen: lightboxImage !== null,
  };
}
