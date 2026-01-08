import { useRef, useEffect, useState, useCallback } from 'react';
import { Bookstore as Bookshop } from '@shared/schema';
import { COLORS, MAP } from '@/lib/constants';
import { logger } from '@/lib/logger';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';

interface MapboxMapProps {
  bookstores: Bookshop[];
  onSelectBookshop: (id: number) => void;
}

const MapboxMap = ({ bookstores, onSelectBookshop }: MapboxMapProps) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<mapboxgl.Marker[]>([]);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [mapError, setMapError] = useState<string | null>(null);

  // Clear existing markers
  const clearMarkers = useCallback(() => {
    if (markersRef.current.length > 0) {
      markersRef.current.forEach(marker => {
        try {
          marker.remove();
        } catch (e) {
          console.error('Error removing marker:', e);
        }
      });
      markersRef.current = [];
    }
  }, []);

  // Initialize map
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;
    
    const initializeMap = async () => {
      try {
        setMapError(null); // Clear any previous errors
        
        // Fetch the access token from the API
        const configResponse = await fetch('/api/config');
        
        if (!configResponse.ok) {
          throw new Error(`Failed to load map configuration (${configResponse.status})`);
        }
        
        const config = await configResponse.json();
        const accessToken = config.mapboxAccessToken;
        
        if (!accessToken) {
          setMapError('Map is temporarily unavailable. Please refresh the page to try again.');
          logger.error('Mapbox access token is missing', undefined, { endpoint: '/api/config' });
          return;
        }
        
        // Use the access token from the server
        mapboxgl.accessToken = accessToken;
        
        const map = new mapboxgl.Map({
          container: mapContainerRef.current!,
          style: 'mapbox://styles/mapbox/streets-v12',
          center: MAP.US_CENTER_MAPBOX,
          zoom: 3,
          interactive: true
        });

        map.on('load', () => {
          setMapLoaded(true);
          setMapError(null); // Clear error on successful load
        });

        map.on('error', (e) => {
          setMapError('Map failed to load. Please refresh the page to try again.');
          logger.error('Mapbox map error', e.error);
        });

        // Add navigation controls
        map.addControl(new mapboxgl.NavigationControl());

        mapRef.current = map;
      } catch (error) {
        const errorMessage = error instanceof Error 
          ? error.message 
          : 'Unable to load map. Please refresh the page to try again.';
        setMapError(errorMessage);
        logger.error('Error initializing Mapbox map', error);
      }
    };
    
    initializeMap();

    // Cleanup on unmount
    return () => {
      clearMarkers();
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, [clearMarkers]);

  // Update markers when bookstores change
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapLoaded) return;

    clearMarkers();

    if (bookstores.length === 0) return;

    const bounds = new mapboxgl.LngLatBounds();
    const validBookstores = bookstores.filter(b => b.longitude && b.latitude);

    validBookstores.forEach(bookstore => {
      try {
        // Parse coordinates from strings
        const longitude = parseFloat(bookstore.longitude || '0');
        const latitude = parseFloat(bookstore.latitude || '0');

        if (isNaN(longitude) || isNaN(latitude)) return;

        // Create popup
        const popup = new mapboxgl.Popup({ offset: 25 })
          .setHTML(`
            <div>
              <h3 style="font-weight: bold; margin-bottom: 5px;">${bookstore.name}</h3>
              <p style="font-size: 12px; margin: 0;">${bookstore.city}, ${bookstore.state}</p>
            </div>
          `);

        // Create custom marker element
        const el = document.createElement('div');
        el.className = 'marker';
        el.style.backgroundColor = COLORS.secondary;
        el.style.width = '24px';
        el.style.height = '24px';
        el.style.borderRadius = '50%';
        el.style.cursor = 'pointer';
        el.style.border = '2px solid white';
        el.style.boxShadow = '0 2px 4px rgba(0,0,0,0.3)';

        // Add marker
        const marker = new mapboxgl.Marker(el)
          .setLngLat([longitude, latitude])
          .setPopup(popup)
          .addTo(map);

        // Add click handler
        el.addEventListener('click', () => {
          onSelectBookshop(bookstore.id);
        });

        markersRef.current.push(marker);
        bounds.extend([longitude, latitude]);
      } catch (e) {
        console.error('Error adding marker:', e);
      }
    });

    // Only fit bounds if we have valid bookstores
    if (validBookstores.length > 0) {
      try {
        map.fitBounds(bounds, {
          padding: 50,
          maxZoom: 12
        });
      } catch (e) {
        console.error('Error fitting bounds:', e);
      }
    }
  }, [bookstores, mapLoaded, clearMarkers, onSelectBookshop]);

  return (
    <div className="relative w-full h-full">
      <div ref={mapContainerRef} className="w-full h-full" />

      {/* Error state - show error message */}
      {mapError && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-200 bg-opacity-90 z-10">
          <div className="text-center p-6 bg-white rounded-lg shadow-lg max-w-md mx-4">
            <div className="text-red-500 text-4xl mb-3">⚠️</div>
            <h3 className="font-semibold text-lg text-gray-900 mb-2">Map Unavailable</h3>
            <p className="text-sm text-gray-600 mb-4">{mapError}</p>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-[#2A6B7C] hover:bg-[#1d5a6a] text-white rounded-md text-sm font-medium transition-colors"
            >
              Refresh Page
            </button>
          </div>
        </div>
      )}

      {/* Loading state - only show if no error */}
      {!mapError && (!mapLoaded || bookstores.length === 0) && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-200 bg-opacity-50">
          <div className="text-center p-4 bg-white rounded-md shadow-md">
            <div className="text-[#2A6B7C] text-4xl mb-2">📍</div>
            <p className="font-medium">Interactive Map</p>
            {bookstores.length === 0 ? (
              <p className="text-sm text-gray-600 mb-2">No bookstores match your current filters.</p>
            ) : (
              <p className="text-sm text-gray-600 mb-2">Loading map...</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default MapboxMap;