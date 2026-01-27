'use client';

import React from 'react';

interface StateFlagProps {
  src: string;
  alt: string;
  className?: string;
}

export default function StateFlag({ src, alt, className = 'w-6 h-4 object-cover rounded-sm flex-shrink-0' }: StateFlagProps) {
  const [imgSrc, setImgSrc] = React.useState(src);

  const handleError = () => {
    // Fallback to a simple placeholder if image fails to load
    setImgSrc(`data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='16'%3E%3Crect width='24' height='16' fill='%23e5e7eb'/%3E%3C/svg%3E`);
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
