'use client';

import { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';

export type MapShop = { name: string; slug: string; lat: number; lng: number };

const TEAL = '#2A6B7C';

/** Mapbox map with one dot per shop, fitted to the shops. Loaded only via LazyShopsMap. */
export default function ShopsMap({ shops }: { shops: MapShop[] }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!containerRef.current || mapRef.current || !shops.length) return;
    let cancelled = false;

    (async () => {
      try {
        const res = await fetch('/api/config');
        const token = res.ok ? (await res.json()).mapboxAccessToken : null;
        if (!token) throw new Error('Mapbox token unavailable');
        if (cancelled || !containerRef.current) return;

        mapboxgl.accessToken = token;
        const bounds = new mapboxgl.LngLatBounds();
        shops.forEach(s => bounds.extend([s.lng, s.lat]));

        const map = new mapboxgl.Map({
          container: containerRef.current,
          style: 'mapbox://styles/mapbox/streets-v12',
          bounds,
          fitBoundsOptions: { padding: 40, maxZoom: 13 },
          cooperativeGestures: true,
        });
        mapRef.current = map;
        map.addControl(new mapboxgl.NavigationControl({ showCompass: false }), 'top-right');

        map.on('load', () => {
          map.addSource('shops', {
            type: 'geojson',
            data: {
              type: 'FeatureCollection',
              features: shops.map(s => ({
                type: 'Feature',
                geometry: { type: 'Point', coordinates: [s.lng, s.lat] },
                properties: { name: s.name, slug: s.slug },
              })),
            },
          });
          map.addLayer({
            id: 'shops',
            type: 'circle',
            source: 'shops',
            paint: {
              'circle-radius': 6,
              'circle-color': TEAL,
              'circle-stroke-width': 2,
              'circle-stroke-color': '#ffffff',
            },
          });
          map.on('click', 'shops', e => {
            const feature = e.features?.[0];
            if (!feature || feature.geometry.type !== 'Point') return;
            const { name, slug } = feature.properties as { name: string; slug: string };
            const link = document.createElement('a');
            link.href = `/bookshop/${slug}`;
            link.textContent = name;
            link.style.color = TEAL;
            link.style.fontWeight = '600';
            new mapboxgl.Popup({ offset: 8 })
              .setLngLat(feature.geometry.coordinates as [number, number])
              .setDOMContent(link)
              .addTo(map);
          });
          map.on('mouseenter', 'shops', () => (map.getCanvas().style.cursor = 'pointer'));
          map.on('mouseleave', 'shops', () => (map.getCanvas().style.cursor = ''));
        });
      } catch (err) {
        console.error('[ShopsMap]', err);
        if (!cancelled) setError('Map is unavailable right now.');
      }
    })();

    return () => {
      cancelled = true;
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, [shops]);

  if (error) {
    return <div className="w-full h-full flex items-center justify-center text-sm text-gray-500">{error}</div>;
  }
  return <div ref={containerRef} className="w-full h-full" />;
}
