'use client';

import React, { useState } from 'react';

interface BookshopImageProps {
  src: string;
  alt: string;
  className?: string;
  fallbackSrc?: string;
}

export default function BookshopImage({ src, alt, className = 'w-full h-full object-cover', fallbackSrc }: BookshopImageProps) {
  const [imgSrc, setImgSrc] = useState(src);
  const defaultFallback = 'https://images.unsplash.com/photo-1507842217343-583bb7270b66?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&h=300';

  const handleError = () => {
    if (imgSrc !== (fallbackSrc || defaultFallback)) {
      setImgSrc(fallbackSrc || defaultFallback);
    }
  };

  return (
    <img
      src={imgSrc}
      alt={alt}
      className={className}
      loading="lazy"
      onError={handleError}
    />
  );
}
