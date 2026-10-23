'use client';

import dynamic from 'next/dynamic';

// mapbox-gl is ~1.6 MB: load it only in the browser, after the page renders
const ShopMap = dynamic(() => import('./ShopMap'), {
  ssr: false,
  loading: () => <div className="w-full h-full bg-brand-cream" aria-hidden="true" />,
});

export default function LazyShopMap(props: { latitude: string; longitude: string; mapboxToken: string }) {
  return <ShopMap {...props} />;
}
