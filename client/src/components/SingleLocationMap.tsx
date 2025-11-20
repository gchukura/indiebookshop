import { useRef, useEffect, useState } from 'react';
import { COLORS } from '@/lib/constants';
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
    // Don't initialize if map already exists or container doesn't exist
    if (!mapContainerRef.current || mapRef.current) return;
    
    // Don't initialize if coordinates are missing
    if (!latitude || !longitude) return;
    
    // Parse coordinates from strings
    const lat = parseFloat(latitude);
    const lng = parseFloat(longitude);
    
    // Don't initialize if coordinates are invalid
    if (isNaN(lat) || isNaN(lng)) return;
    
    // Create async function to fetch token and initialize map
    const initMap = async () => {
      try {
        // Fetch the MapBox token from server
        const response = await fetch('/api/config');
        const config = await response.json();
        const token = config.mapboxAccessToken;
        
        if (!token) {
          // Silently handle missing token - map just won't render
          return;
        }
        
        // Set the token
        mapboxgl.accessToken = token;
        
        // Create the map
        const mapInstance = new mapboxgl.Map({
          container: mapContainerRef.current!,
          style: 'mapbox://styles/mapbox/streets-v12',
          center: [lng, lat],
          zoom: 14,
          interactive: true
        });
        
        // Set up map event handlers
        mapInstance.on('load', () => {
          setMapLoaded(true);
          if (process.env.NODE_ENV === 'development') {
            console.log('Detail map loaded successfully');
          }
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
        
        // Store map reference
        mapRef.current = mapInstance;
      } catch (error) {
        console.error('Error initializing detail map:', error);
      }
    };
    
    // Call the async initialization function
    initMap();
    
    // Cleanup on unmount
    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, [latitude, longitude]);

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

  // Render the map container and loading state
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