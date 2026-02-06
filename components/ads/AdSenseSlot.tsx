'use client';

// components/ads/AdSenseSlot.tsx
// Base AdSense component with CLS prevention

import { useEffect, useRef } from 'react';

interface AdSenseSlotProps {
  adSlot: string;
  adFormat?: 'auto' | 'rectangle' | 'horizontal' | 'vertical';
  fullWidthResponsive?: boolean;
  className?: string;
  style?: React.CSSProperties;
  // Fixed dimensions for CLS prevention
  minHeight?: number;
  minWidth?: number;
}

// Publisher ID - replace with actual ID
const PUBLISHER_ID = 'ca-pub-4357894821158922';

export function AdSenseSlot({
  adSlot,
  adFormat = 'auto',
  fullWidthResponsive = true,
  className = '',
  style = {},
  minHeight = 250,
  minWidth = 300,
}: AdSenseSlotProps) {
  const adRef = useRef<HTMLDivElement>(null);
  const isLoaded = useRef(false);

  useEffect(() => {
    // Prevent double-loading
    if (isLoaded.current) return;

    try {
      // Push the ad
      if (typeof window !== 'undefined' && (window as any).adsbygoogle) {
        (window as any).adsbygoogle.push({});
        isLoaded.current = true;
      }
    } catch (error) {
      console.error('AdSense error:', error);
    }
  }, []);

  return (
    <div
      ref={adRef}
      className={`adsense-container ${className}`}
      style={{
        minHeight: `${minHeight}px`,
        minWidth: `${minWidth}px`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#f5f5f5',
        ...style,
      }}
    >
      <ins
        className="adsbygoogle"
        style={{
          display: 'block',
          width: '100%',
          height: '100%',
        }}
        data-ad-client={PUBLISHER_ID}
        data-ad-slot={adSlot}
        data-ad-format={adFormat}
        data-full-width-responsive={fullWidthResponsive.toString()}
      />
    </div>
  );
}

export default AdSenseSlot;
