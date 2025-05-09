import { useRef, useEffect, useState } from 'react';
import { MAPBOX_ACCESS_TOKEN, COLORS } from '@/lib/constants';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';

interface SingleLocationMapProps {
  latitude?: string | null;
  longitude?: string | null;
}

const SingleLocationMap = ({ latitude, longitude }: SingleLocationMapProps) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const [mapLoaded, setMapLoaded] = useState(false);

  // Initialize map
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;
    if (!latitude || !longitude) return;
    
    const lat = parseFloat(latitude);
    const lng = parseFloat(longitude);
    
    if (isNaN(lat) || isNaN(lng)) return;
    
    try {
      mapboxgl.accessToken = MAPBOX_ACCESS_TOKEN || "";
      
      const map = new mapboxgl.Map({
        container: mapContainerRef.current,
        style: 'mapbox://styles/mapbox/streets-v12',
        center: [lng, lat],
        zoom: 14,
        interactive: true
      });

      map.on('load', () => {
        setMapLoaded(true);
      });

      // Add navigation controls
      map.addControl(new mapboxgl.NavigationControl());

      // Add marker
      const el = document.createElement('div');
      el.className = 'marker';
      el.style.backgroundColor = COLORS.secondary;
      el.style.width = '24px';
      el.style.height = '24px';
      el.style.borderRadius = '50%';
      el.style.cursor = 'pointer';
      el.style.border = '2px solid white';
      el.style.boxShadow = '0 2px 4px rgba(0,0,0,0.3)';

      new mapboxgl.Marker(el)
        .setLngLat([lng, lat])
        .addTo(map);

      mapRef.current = map;
    } catch (error) {
      console.error('Error initializing Mapbox map:', error);
    }

    // Cleanup on unmount
    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, [latitude, longitude]);

  if (!latitude || !longitude) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center p-4">
          <div className="text-[#2A6B7C] text-4xl mb-2">📍</div>
          <p className="text-sm">Location data not available</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full h-full">
      <div ref={mapContainerRef} className="w-full h-full"></div>
      
      {!mapLoaded && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-200 bg-opacity-50">
          <div className="text-center p-4 bg-white rounded-md shadow-md">
            <div className="text-[#2A6B7C] text-4xl mb-2">📍</div>
            <p className="font-medium">Store Location</p>
            <p className="text-sm text-gray-600 mb-2">Loading map...</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default SingleLocationMap;