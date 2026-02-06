'use client';

// components/ads/ResponsiveAdSlot.tsx
// Responsive ad slot that shows different ad sizes based on screen width

import { useEffect, useState } from 'react';
import { AdSenseSlot } from './AdSenseSlot';
import { LazyAdSenseSlot } from './LazyAdSenseSlot';

interface ResponsiveAdSlotProps {
  // Desktop ad configuration
  desktopSlot: string;
  desktopWidth?: number;
  desktopHeight?: number;
  // Mobile ad configuration
  mobileSlot: string;
  mobileWidth?: number;
  mobileHeight?: number;
  // Breakpoint (default 768px)
  breakpoint?: number;
  // Lazy load?
  lazy?: boolean;
  className?: string;
}

export function ResponsiveAdSlot({
  desktopSlot,
  desktopWidth = 728,
  desktopHeight = 90,
  mobileSlot,
  mobileWidth = 320,
  mobileHeight = 50,
  breakpoint = 768,
  lazy = false,
  className = '',
}: ResponsiveAdSlotProps) {
  const [isMobile, setIsMobile] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);

    const checkMobile = () => {
      setIsMobile(window.innerWidth < breakpoint);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);

    return () => {
      window.removeEventListener('resize', checkMobile);
    };
  }, [breakpoint]);

  // Prevent hydration mismatch
  if (!mounted) {
    return (
      <div
        className={className}
        style={{
          minHeight: `${desktopHeight}px`,
          minWidth: `${desktopWidth}px`,
        }}
      />
    );
  }

  const AdComponent = lazy ? LazyAdSenseSlot : AdSenseSlot;

  if (isMobile) {
    return (
      <AdComponent
        adSlot={mobileSlot}
        adFormat="horizontal"
        minWidth={mobileWidth}
        minHeight={mobileHeight}
        className={className}
      />
    );
  }

  return (
    <AdComponent
      adSlot={desktopSlot}
      adFormat="horizontal"
      minWidth={desktopWidth}
      minHeight={desktopHeight}
      className={className}
    />
  );
}

export default ResponsiveAdSlot;
