import { useRef, useEffect, useState } from 'react';
import { Bookstore } from '@shared/schema';

interface GoogleMapProps {
  bookstores: Bookstore[];
  onSelectBookstore: (id: number) => void;
}

const GoogleMap = ({ bookstores, onSelectBookstore }: GoogleMapProps) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const [map, setMap] = useState<google.maps.Map | null>(null);
  const [markers, setMarkers] = useState<google.maps.Marker[]>([]);

  // Initialize map
  useEffect(() => {
    if (mapRef.current && !map) {
      const mapOptions = {
        center: { lat: 39.8283, lng: -98.5795 }, // Center of US
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

      const newMap = new google.maps.Map(mapRef.current, mapOptions);
      setMap(newMap);
    }
  }, [mapRef, map]);

  // Add markers for bookstores
  useEffect(() => {
    if (map && bookstores.length > 0) {
      // Clear existing markers
      markers.forEach(marker => marker.setMap(null));
      
      // Create bounds to fit all markers
      const bounds = new google.maps.LatLngBounds();
      
      // Add new markers
      const newMarkers = bookstores
        .filter(bookstore => bookstore.latitude && bookstore.longitude)
        .map(bookstore => {
          const position = {
            lat: parseFloat(bookstore.latitude!),
            lng: parseFloat(bookstore.longitude!)
          };
          
          // Add position to bounds
          bounds.extend(position);
          
          // Create marker
          const marker = new google.maps.Marker({
            position,
            map,
            title: bookstore.name,
            animation: google.maps.Animation.DROP,
            icon: {
              url: 'https://maps.google.com/mapfiles/ms/icons/blue-dot.png'
            }
          });
          
          // Add click event
          marker.addListener('click', () => {
            onSelectBookstore(bookstore.id);
          });
          
          return marker;
        });
      
      setMarkers(newMarkers);
      
      // Fit map to all markers if there are any
      if (newMarkers.length > 0) {
        map.fitBounds(bounds);
        
        // Don't zoom in too far
        const listener = google.maps.event.addListener(map, 'idle', () => {
          if (map.getZoom()! > 12) {
            map.setZoom(12);
          }
          google.maps.event.removeListener(listener);
        });
      }
    }
  }, [map, bookstores, onSelectBookstore]);

  return (
    <div ref={mapRef} className="w-full h-full rounded-lg overflow-hidden">
      {(!map || bookstores.length === 0) && (
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
