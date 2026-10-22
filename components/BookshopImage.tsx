'use client';

import React, { useState } from 'react';

interface BookshopImageProps {
  src: string;
  alt: string;
  className?: string;
  /** Shown if src fails to load; pass the shop's placeholder from getPlaceholderUrl. */
  fallbackSrc?: string;
}

const DEFAULT_FALLBACK = '/placeholders/books-01-400.webp';

export default function BookshopImage({ src, alt, className = 'w-full h-full object-cover', fallbackSrc = DEFAULT_FALLBACK }: BookshopImageProps) {
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
      loading="lazy"
      decoding="async"
      onError={handleError}
    />
  );
}
