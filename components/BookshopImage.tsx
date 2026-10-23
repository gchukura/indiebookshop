'use client';

import React, { useState } from 'react';

interface BookshopImageProps {
  src: string;
  alt: string;
  className?: string;
  /** Shown if src fails to load; pass the shop's placeholder from getPlaceholderUrl. */
  fallbackSrc?: string;
  /** The page's main image (LCP): load immediately at high priority instead of lazily. */
  priority?: boolean;
  srcSet?: string;
  sizes?: string;
}

const DEFAULT_FALLBACK = '/placeholders/books-01-400.webp';

export default function BookshopImage({ src, alt, className = 'w-full h-full object-cover', fallbackSrc = DEFAULT_FALLBACK, priority = false, srcSet, sizes }: BookshopImageProps) {
  const [imgSrc, setImgSrc] = useState(src);

  const handleError = () => {
    if (imgSrc !== fallbackSrc) {
      setImgSrc(fallbackSrc);
    }
  };

  return (
    <img
      src={imgSrc}
      alt={alt}
      className={className}
      srcSet={imgSrc === src ? srcSet : undefined}
      sizes={imgSrc === src ? sizes : undefined}
      loading={priority ? 'eager' : 'lazy'}
      fetchPriority={priority ? 'high' : undefined}
      decoding="async"
      onError={handleError}
    />
  );
}
