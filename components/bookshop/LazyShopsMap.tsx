'use client';

import { useEffect, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import type { MapShop } from './ShopsMap';

const ShopsMap = dynamic(() => import('./ShopsMap'), { ssr: false });

/**
 * Reserves space for the shops map and loads Mapbox only once the box scrolls
 * near the viewport, so pages that are never scrolled don't pay for it.
 */
export default function LazyShopsMap({ shops, title }: { shops: MapShop[]; title: string }) {
  const boxRef = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const box = boxRef.current;
    if (!box || visible) return;
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

  if (!shops.length) return null;

  return (
    <div
      ref={boxRef}
      role="region"
      aria-label={title}
      className="w-full h-72 md:h-96 rounded-lg overflow-hidden bg-[#F7F3E8] border border-gray-200"
    >
      {visible ? (
        <ShopsMap shops={shops} />
      ) : (
        <div className="w-full h-full flex items-center justify-center text-sm text-gray-500">Loading map…</div>
      )}
    </div>
  );
}
