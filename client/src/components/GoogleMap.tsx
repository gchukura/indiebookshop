import { useRef, useEffect, useState, useCallback } from 'react';
import { Bookstore } from '@shared/schema';
import { MAP } from '@/lib/constants';

// Define minimal Google Maps types to avoid TypeScript errors
// These are minimal interfaces since @types/google.maps may not be installed
interface GoogleMapInstance {
  setZoom: (zoom: number) => void;
  getZoom: () => number;
  fitBounds: (bounds: GoogleLatLngBounds) => void;
}

interface GoogleMarker {
  setMap: (map: GoogleMapInstance | null) => void;
  addListener: (event: string, handler: () => void) => void;
}

interface GoogleLatLngBounds {
  extend: (position: { lat: number; lng: number }) => void;
}

interface GoogleMapsEvent {
  addListener: (instance: GoogleMapInstance, event: string, handler: () => void) => void;
  removeListener: (listener: unknown) => void;
}

declare global {
  interface Window {
    google: {
      maps: {
        Map: new (element: HTMLElement, options: unknown) => GoogleMapInstance;
        Marker: new (options: unknown) => GoogleMarker;
        LatLngBounds: new () => GoogleLatLngBounds;
        event: GoogleMapsEvent;
        Animation: {
          DROP: unknown;
        };
      };
    };
  }
}

interface GoogleMapProps {
  bookstores: Bookstore[];
  onSelectBookstore: (id: number) => void;
}

const GoogleMap = ({ bookstores, onSelectBookstore }: GoogleMapProps) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<GoogleMapInstance | null>(null);
  const markersRef = useRef<GoogleMarker[]>([]);
  const [mapLoaded, setMapLoaded] = useState(false);

  // Clean up markers
  const clearMarkers = useCallback(() => {
    if (markersRef.current && markersRef.current.length > 0) {
      markersRef.current.forEach(marker => {
        if (marker) {
          try {
            marker.setMap(null);
          } catch (e) {
            console.error('Error clearing marker:', e);
          }
        }
      });
      markersRef.current = [];
    }
  }, []);

  // Initialize map
  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current || !window.google) return;
    
    try {
      const mapOptions = {
        center: MAP.US_CENTER_GOOGLE,
        zoom: 4,
        mapTypeControl: false,
        streetViewControl: false,
        styles: [
          {
            featureType: 'poi',
            elementType: 'labels',
            stylers: [{ visibility: 'off' }]
          }
        ]
      };

      mapInstanceRef.current = new window.google.maps.Map(mapRef.current, mapOptions);
      setMapLoaded(true);
    } catch (e) {
      console.error('Error initializing map:', e);
    }

    // Cleanup when component unmounts
    return () => {
      clearMarkers();
      mapInstanceRef.current = null;
    };
  }, [clearMarkers]);

  // Update markers when bookstores change
  useEffect(() => {
    if (!mapInstanceRef.current || !window.google) return;
    
    // Clear existing markers first
    clearMarkers();
    
    // If no bookstores, just return after clearing
    if (!bookstores.length) return;
    
    try {
      // Create bounds to fit all markers
      const bounds = new window.google.maps.LatLngBounds();
      const validBookstores = bookstores.filter(b => 
        b.latitude && b.longitude && 
        !isNaN(parseFloat(b.latitude)) && 
        !isNaN(parseFloat(b.longitude))
      );
      
      // Create new markers for filtered bookstores
      const newMarkers = validBookstores.map(bookstore => {
        try {
          const position = {
            lat: parseFloat(bookstore.latitude || "0"),
            lng: parseFloat(bookstore.longitude || "0")
          };
          
          // Skip invalid coordinates
          if (isNaN(position.lat) || isNaN(position.lng)) {
            return null;
          }
          
          // Add position to bounds
          bounds.extend(position);
          
          // Create marker
          const marker = new window.google.maps.Marker({
            position,
            map: mapInstanceRef.current,
            title: bookstore.name,
            animation: window.google.maps.Animation.DROP,
            icon: {
              url: 'https://maps.google.com/mapfiles/ms/icons/blue-dot.png'
            }
          });
          
          // Add click event
          marker.addListener('click', () => {
            onSelectBookstore(bookstore.id);
          });
          
          return marker;
        } catch (e) {
          console.error('Error creating marker:', e);
          return null;
        }
      }).filter((marker): marker is GoogleMarker => marker !== null); // Filter out null markers with type guard
      
      // Save references to the new markers
      markersRef.current = newMarkers;
      
      // Fit map to markers if there are any
      if (newMarkers.length > 0) {
        try {
          mapInstanceRef.current.fitBounds(bounds);
          
          // Don't zoom in too far
          const listener = window.google.maps.event.addListener(mapInstanceRef.current, 'idle', () => {
            if (mapInstanceRef.current && mapInstanceRef.current.getZoom() > 12) {
              mapInstanceRef.current.setZoom(12);
            }
            window.google.maps.event.removeListener(listener);
          });
        } catch (e) {
          console.error('Error fitting bounds:', e);
        }
      }
    } catch (e) {
      console.error('Error updating markers:', e);
    }
  }, [bookstores, onSelectBookstore, clearMarkers]);

  return (
    <div className="w-full h-full rounded-lg overflow-hidden relative">
      <div ref={mapRef} className="w-full h-full" />
      
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

export default GoogleMap;
