'use client';

// components/ads/LazyAdSenseSlot.tsx
// Lazy-loaded AdSense component using Intersection Observer

import { useEffect, useRef, useState } from 'react';
import { AdSenseSlot } from './AdSenseSlot';

interface LazyAdSenseSlotProps {
  adSlot: string;
  adFormat?: 'auto' | 'rectangle' | 'horizontal' | 'vertical';
  fullWidthResponsive?: boolean;
  className?: string;
  minHeight?: number;
  minWidth?: number;
  // How many pixels before the ad becomes visible to start loading
  rootMargin?: string;
}

export function LazyAdSenseSlot({
  adSlot,
  adFormat = 'auto',
  fullWidthResponsive = true,
  className = '',
  minHeight = 250,
  minWidth = 300,
  rootMargin = '200px',
}: LazyAdSenseSlotProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsVisible(true);
            observer.disconnect();
          }
        });
      },
      {
        rootMargin,
        threshold: 0,
      }
    );

    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    return () => {
      observer.disconnect();
    };
  }, [rootMargin]);

  return (
    <div
      ref={containerRef}
      className={`lazy-ad-container ${className}`}
      style={{
        minHeight: `${minHeight}px`,
        minWidth: `${minWidth}px`,
      }}
    >
      {isVisible ? (
        <AdSenseSlot
          adSlot={adSlot}
          adFormat={adFormat}
          fullWidthResponsive={fullWidthResponsive}
          minHeight={minHeight}
          minWidth={minWidth}
        />
      ) : (
        <div
          style={{
            width: '100%',
            height: `${minHeight}px`,
            backgroundColor: '#f5f5f5',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {/* Placeholder for CLS prevention */}
        </div>
      )}
    </div>
  );
}

export default LazyAdSenseSlot;
