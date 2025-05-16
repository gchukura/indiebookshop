import { useRef, useEffect, useState, useCallback } from 'react';
import { Bookstore as Bookshop } from '@shared/schema';
import { COLORS } from '@/lib/constants';
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
        // Fetch the access token from the API
        const configResponse = await fetch('/api/config');
        const config = await configResponse.json();
        const accessToken = config.mapboxAccessToken;
        
        console.log("Access token received from API:", !!accessToken);
        
        if (!accessToken) {
          console.error('No Mapbox access token available');
          return;
        }
        
        // Use the access token from the server
        mapboxgl.accessToken = accessToken;
        
        const map = new mapboxgl.Map({
          container: mapContainerRef.current!,
          style: 'mapbox://styles/mapbox/streets-v12',
          center: [-98.5795, 39.8283], // Center of US
          zoom: 3,
          interactive: true
        });

        map.on('load', () => {
          setMapLoaded(true);
          console.log("Mapbox map loaded successfully");
        });

        // Add navigation controls
        map.addControl(new mapboxgl.NavigationControl());

        mapRef.current = map;
      } catch (error) {
        console.error('Error initializing Mapbox map:', error);
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
    // Limit to max 100 markers for mobile performance
    const isMobile = window.innerWidth < 768;
    const markerLimit = isMobile ? 100 : 500;
    
    // Only show a subset of bookstores on mobile to improve performance
    const validBookstores = bookstores
      .filter(b => b.longitude && b.latitude)
      .slice(0, markerLimit);

    // Create markers in batches for better performance
    const createMarkersInBatches = () => {
      const batchSize = 20; // Process 20 markers at a time
      let currentIndex = 0;
      
      const processBatch = () => {
        if (currentIndex >= validBookstores.length) return;
        
        const endIndex = Math.min(currentIndex + batchSize, validBookstores.length);
        const batch = validBookstores.slice(currentIndex, endIndex);
        
        batch.forEach(bookstore => {
          try {
            // Parse coordinates from strings
            const longitude = parseFloat(bookstore.longitude || '0');
            const latitude = parseFloat(bookstore.latitude || '0');

            if (isNaN(longitude) || isNaN(latitude)) return;

            // Create popup - use lighter version on mobile
            const popup = new mapboxgl.Popup({ offset: 25 })
              .setHTML(`
                <div>
                  <h3 style="font-weight: bold; margin-bottom: 5px;">${bookstore.name}</h3>
                  <p style="font-size: 12px; margin: 0;">${bookstore.city}, ${bookstore.state}</p>
                </div>
              `);

            // Create custom marker element - smaller on mobile
            const el = document.createElement('div');
            el.className = 'marker';
            el.style.backgroundColor = COLORS.secondary;
            el.style.width = isMobile ? '16px' : '24px';
            el.style.height = isMobile ? '16px' : '24px';
            el.style.borderRadius = '50%';
            el.style.cursor = 'pointer';
            el.style.border = isMobile ? '1px solid white' : '2px solid white';
            el.style.boxShadow = isMobile ? '0 1px 2px rgba(0,0,0,0.3)' : '0 2px 4px rgba(0,0,0,0.3)';

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
        
        currentIndex = endIndex;
        
        // Process next batch with a small delay to prevent UI blocking
        if (currentIndex < validBookstores.length) {
          setTimeout(processBatch, 10);
        } else {
          // Only fit bounds after all markers are added
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
        }
      };
      
      // Start processing the first batch
      processBatch();
    };
    
    createMarkersInBatches();
  }, [bookstores, mapLoaded, clearMarkers, onSelectBookshop]);

  return (
    <div className="relative w-full h-full">
      <div ref={mapContainerRef} className="w-full h-full" />

      {(!mapLoaded || bookstores.length === 0) && (
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