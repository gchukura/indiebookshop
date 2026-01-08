import { useRef, useEffect, useState } from 'react';
import { COLORS } from '@/lib/constants';
import { logger } from '@/lib/logger';
import mapboxgl from 'mapbox-gl';
import { loadMapboxCss } from '@/lib/mapboxCssLoader';

interface SingleLocationMapProps {
  latitude?: string | null;
  longitude?: string | null;
}

const SingleLocationMap = ({ latitude, longitude }: SingleLocationMapProps) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [mapError, setMapError] = useState<string | null>(null);
  const [cssLoaded, setCssLoaded] = useState(false);
  const [cssError, setCssError] = useState<Error | null>(null);

  // Load Mapbox CSS first
  useEffect(() => {
    loadMapboxCss()
      .then(() => {
        setCssLoaded(true);
        setCssError(null);
      })
      .catch((err) => {
        setCssError(err instanceof Error ? err : new Error('Failed to load Mapbox CSS'));
        setCssLoaded(false);
      });
  }, []);

  // Initialize map (only after CSS is loaded)
  useEffect(() => {
    // Wait for CSS to load
    if (!cssLoaded) {
      if (cssError) {
        setMapError('Failed to load map styles. Please refresh the page.');
      }
      return;
    }
    
    // Don't initialize if map already exists or container doesn't exist
    if (!mapContainerRef.current || mapRef.current) return;
    
    // Don't initialize if coordinates are missing
    if (!latitude || !longitude) return;
    
    // Parse coordinates from strings
    const lat = parseFloat(latitude);
    const lng = parseFloat(longitude);
    
    // Don't initialize if coordinates are invalid
    if (isNaN(lat) || isNaN(lng)) return;
    
    // Track if component is still mounted
    let isMounted = true;
    
    // Create async function to fetch token and initialize map
    const initMap = async () => {
      try {
        // Fetch the MapBox token from server
        const response = await fetch('/api/config');
        
        if (!response.ok) {
          throw new Error(`Failed to load map configuration (${response.status})`);
        }
        
        const config = await response.json();
        const token = config.mapboxAccessToken;
        
        if (!token) {
          // Set error state for missing token
          setMapError('Map is temporarily unavailable. Please refresh the page to try again.');
          logger.error('Mapbox access token is missing in SingleLocationMap', undefined, { endpoint: '/api/config' });
          return;
        }
        
        // Set the token
        mapboxgl.accessToken = token;
        
        // Double-check that the container ref is still valid before creating the map
        // This prevents errors if the component unmounts during the async fetch
        if (!isMounted || !mapContainerRef.current) {
          logger.warn('Component unmounted or map container ref is null, cannot initialize map');
          return;
        }
        
        // Verify the ref points to an actual DOM element
        if (!(mapContainerRef.current instanceof HTMLElement)) {
          logger.error('Map container ref is not an HTMLElement', undefined, {
            refType: typeof mapContainerRef.current,
            refValue: mapContainerRef.current
          });
          setMapError('Map container is invalid. Please refresh the page.');
          return;
        }
        
        // Create the map
        const mapInstance = new mapboxgl.Map({
          container: mapContainerRef.current,
          style: 'mapbox://styles/mapbox/streets-v12',
          center: [lng, lat],
          zoom: 14,
          interactive: true
        });
        
        // Set up map event handlers
        mapInstance.on('load', () => {
          setMapLoaded(true);
          setMapError(null); // Clear error on successful load
          logger.debug('Detail map loaded successfully');
        });
        
        mapInstance.on('error', (e) => {
          setMapError('Map failed to load. Please refresh the page to try again.');
          logger.error('Mapbox map error in SingleLocationMap', e.error);
        });
        
        // Add navigation controls
        mapInstance.addControl(new mapboxgl.NavigationControl());
        
        // Create custom marker
        const markerElement = document.createElement('div');
        markerElement.className = 'marker';
        markerElement.style.backgroundColor = COLORS.secondary;
        markerElement.style.width = '24px';
        markerElement.style.height = '24px';
        markerElement.style.borderRadius = '50%';
        markerElement.style.border = '2px solid white';
        markerElement.style.boxShadow = '0 2px 4px rgba(0,0,0,0.3)';
        
        // Add marker to map
        new mapboxgl.Marker(markerElement)
          .setLngLat([lng, lat])
          .addTo(mapInstance);
        
        // Store map reference only if component is still mounted
        if (isMounted) {
        mapRef.current = mapInstance;
        } else {
          // Component unmounted, clean up the map
          mapInstance.remove();
        }
      } catch (error) {
        if (!isMounted) return; // Don't set state if unmounted
        
        const errorMessage = error instanceof Error 
          ? error.message 
          : 'Unable to load map. Please refresh the page to try again.';
        setMapError(errorMessage);
        logger.error('Error initializing detail map', error);
      }
    };
    
    // Call the async initialization function
    initMap();
    
    // Cleanup on unmount
    return () => {
      isMounted = false;
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, [latitude, longitude, cssLoaded, cssError]);

  // If no coordinates are available, show a message
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

  // Render the map container and loading/error states
  return (
    <div className="relative w-full h-full">
      <div ref={mapContainerRef} className="w-full h-full"></div>
      
      {/* Error state - show error message */}
      {mapError && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-200 bg-opacity-90 z-10">
          <div className="text-center p-4 bg-white rounded-lg shadow-lg max-w-sm mx-4">
            <div className="text-red-500 text-3xl mb-2">⚠️</div>
            <p className="text-sm text-gray-600 mb-3">{mapError}</p>
            <button
              onClick={() => window.location.reload()}
              className="px-3 py-1.5 bg-[#2A6B7C] hover:bg-[#1d5a6a] text-white rounded-md text-xs font-medium transition-colors"
            >
              Refresh Page
            </button>
          </div>
        </div>
      )}

      {/* Loading state - only show if no error */}
      {!mapError && !mapLoaded && (
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