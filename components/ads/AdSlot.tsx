'use client';

import { useEffect, useRef, useState } from 'react';
import { ADSENSE_CLIENT, adSlotId, type AdSlotName } from '@/lib/ads';
import { cn } from '@/lib/utils';

type AdSlotProps = {
  name: AdSlotName;
  /** "banner": full width, 280px tall. "rail": fixed 300×600. */
  variant?: 'banner' | 'rail';
  /** Wait until the slot is within 200px of the viewport. Pass false for the first ad on a page. */
  lazy?: boolean;
  className?: string;
};

declare global {
  interface Window {
    adsbygoogle?: unknown[];
  }
}

/**
 * One AdSense unit in a box of fixed height, so filling it (or not) never moves
 * the page. Render it only when ADS_ENABLED; the script is loaded by the layout.
 */
export default function AdSlot({ name, variant = 'banner', lazy = true, className }: AdSlotProps) {
  const boxRef = useRef<HTMLDivElement>(null);
  const pushed = useRef(false);
  const [visible, setVisible] = useState(!lazy);
  const slotId = adSlotId(name);

  useEffect(() => {
    const box = boxRef.current;
    if (visible || !box) return;
    const observer = new IntersectionObserver(
      entries => {
        if (entries.some(e => e.isIntersecting)) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: '200px' }
    );
    observer.observe(box);
    return () => observer.disconnect();
  }, [visible]);

  useEffect(() => {
    if (!visible || !slotId || pushed.current) return;
    pushed.current = true;
    try {
      // Queues the request; adsbygoogle.js processes it once loaded
      (window.adsbygoogle = window.adsbygoogle || []).push({});
    } catch (err) {
      console.error('AdSense error:', err);
    }
  }, [visible, slotId]);

  const rail = variant === 'rail';
  return (
    <aside aria-label="Advertisement" className={cn(rail ? 'w-[300px]' : 'w-full', className)}>
      <p className="text-sm text-gray-500 mb-1">Advertisement</p>
      <div
        ref={boxRef}
        className={cn('overflow-hidden rounded-lg bg-brand-cream', rail ? 'h-[600px] w-[300px]' : 'h-[280px] w-full')}
      >
        {visible && slotId && (
          <ins
            className="adsbygoogle"
            style={rail ? { display: 'inline-block', width: 300, height: 600 } : { display: 'block', width: '100%', height: 280 }}
            data-ad-client={ADSENSE_CLIENT}
            data-ad-slot={slotId}
            {...(rail ? {} : { 'data-ad-format': 'auto', 'data-full-width-responsive': 'false' })}
          />
        )}
      </div>
    </aside>
  );
}
