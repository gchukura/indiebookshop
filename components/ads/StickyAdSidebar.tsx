'use client';

// components/ads/StickyAdSidebar.tsx
// Sticky sidebar ad for desktop (300x600 or 300x250)

import { useEffect, useState } from 'react';
import { LazyAdSenseSlot } from './LazyAdSenseSlot';

interface StickyAdSidebarProps {
  adSlot: string;
  width?: number;
  height?: number;
  // Offset from top when sticky
  topOffset?: number;
  className?: string;
  // Only show on desktop
  hideOnMobile?: boolean;
}

export function StickyAdSidebar({
  adSlot,
  width = 300,
  height = 600,
  topOffset = 100,
  className = '',
  hideOnMobile = true,
}: StickyAdSidebarProps) {
  const [isDesktop, setIsDesktop] = useState(true);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);

    const checkDesktop = () => {
      setIsDesktop(window.innerWidth >= 1024);
    };

    checkDesktop();
    window.addEventListener('resize', checkDesktop);

    return () => {
      window.removeEventListener('resize', checkDesktop);
    };
  }, []);

  // Don't render on mobile if hidden
  if (mounted && hideOnMobile && !isDesktop) {
    return null;
  }

  // Prevent hydration mismatch
  if (!mounted) {
    return null;
  }

  return (
    <div
      className={`sticky-ad-sidebar ${className}`}
      style={{
        position: 'sticky',
        top: `${topOffset}px`,
        width: `${width}px`,
        height: `${height}px`,
      }}
    >
      <LazyAdSenseSlot
        adSlot={adSlot}
        adFormat="vertical"
        fullWidthResponsive={false}
        minWidth={width}
        minHeight={height}
      />
    </div>
  );
}

export default StickyAdSidebar;
