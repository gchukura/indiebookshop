'use client';

import { useEffect, useRef, useState } from 'react';
import dynamic from 'next/dynamic';

// mapbox-gl is ~1.6 MB: load it only in the browser, and only once the map box
// is near the screen, so it doesn't compete with the page's photo on load
const ShopMap = dynamic(() => import('./ShopMap'), {
  ssr: false,
  loading: () => <div className="w-full h-full bg-brand-cream" aria-hidden="true" />,
});

export default function LazyShopMap(props: { latitude: string; longitude: string; mapboxToken: string }) {
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

  return (
    <div ref={boxRef} className="w-full h-full bg-brand-cream">
      {visible && <ShopMap {...props} />}
    </div>
  );
}
