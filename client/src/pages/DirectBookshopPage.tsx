import React, { useEffect, useMemo } from 'react';
import { useParams, useLocation } from 'wouter';
import { useQuery } from '@tanstack/react-query';
import { Bookstore as Bookshop, Feature, Event } from '@shared/schema';
import { Button } from '@/components/ui/button';
import SingleLocationMap from '@/components/SingleLocationMap';
import { SEO } from '../components/SEO';
import { 
  BASE_URL, 
  generateDescription,
  DESCRIPTION_TEMPLATES
} from '../lib/seo';

/**
 * A simplified bookshop detail page that directly fetches by ID
 * This is a stripped-down version to troubleshoot the bookshop detail issue
 */
const DirectBookshopPage: React.FC = () => {
  // Get the ID parameter from the URL
  const { id } = useParams<{ id: string }>();
  const [location, setLocation] = useLocation();
  const bookshopId = id ? parseInt(id) : undefined;
  
  // Direct API fetch with logging 
  console.log(`Attempting to fetch bookshop with ID: ${bookshopId}`);
  
  // Fetch bookshop details directly
  const { data: bookshop, isLoading, isError } = useQuery<Bookshop>({
    queryKey: bookshopId ? [`/api/bookstores/${bookshopId}`] : ['skip-query'],
    enabled: bookshopId !== undefined,
  });
  
  // Fetch related data
  const { data: features } = useQuery<Feature[]>({
    queryKey: ["/api/features"],
  });
  
  const { data: events } = useQuery<Event[]>({
    queryKey: bookshopId ? [`/api/bookstores/${bookshopId}/events`] : ['skip-events-query'],
    enabled: bookshopId !== undefined,
  });
  
  // Render loading state
  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-16 text-center">
        <p>Loading bookshop details for ID: {bookshopId}...</p>
      </div>
    );
  }
  
  // Render error state
  if (isError || !bookshop) {
    return (
      <div className="container mx-auto px-4 py-16 text-center">
        <p>Error loading bookshop with ID: {bookshopId}. The bookshop may not exist or there was a problem with the connection.</p>
        <Button 
          className="mt-4 bg-[#2A6B7C] hover:bg-[#2A6B7C]/90 text-white"
          onClick={() => setLocation('/directory')}
        >
          Return to Directory
        </Button>
      </div>
    );
  }
  
  // Get bookshop features if available
  const bookshopFeatures = useMemo(() => {
    if (!features || !bookshop.featureIds) return [];
    
    // Handle different formats of featureIds
    let featureIds: number[] = [];
    
    if (Array.isArray(bookshop.featureIds)) {
      featureIds = bookshop.featureIds;
    } else if (typeof bookshop.featureIds === 'string') {
      featureIds = bookshop.featureIds.split(',')
        .map(id => parseInt(id.trim()))
        .filter(id => !isNaN(id));
    }
    
    return features.filter(feature => featureIds.includes(feature.id));
  }, [bookshop, features]);
  
  // Simple display of the bookshop details - minimal styling to focus on functionality
  return (
    <div className="bg-gray-100 min-h-screen p-8">
      <div className="max-w-5xl mx-auto bg-white p-6 rounded-lg shadow-md">
        <h1 className="text-3xl font-bold mb-4">{bookshop.name}</h1>
        <div className="text-lg mb-2">
          {bookshop.city}, {bookshop.state}
        </div>
        
        <div className="my-6">
          <p className="text-gray-700">{bookshop.description}</p>
        </div>
        
        {bookshopFeatures.length > 0 && (
          <div className="mb-6">
            <h2 className="text-xl font-semibold mb-2">Features</h2>
            <div className="flex flex-wrap gap-2">
              {bookshopFeatures.map(feature => (
                <span key={feature.id} className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm">
                  {feature.name}
                </span>
              ))}
            </div>
          </div>
        )}
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <div>
            <h2 className="text-xl font-semibold mb-2">Contact Information</h2>
            <p>{bookshop.street}</p>
            <p>{bookshop.city}, {bookshop.state} {bookshop.zip}</p>
            <p className="mt-2">Phone: {bookshop.phone || 'Not available'}</p>
            {bookshop.website && (
              <p className="mt-2">
                <a 
                  href={bookshop.website} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline"
                >
                  Visit Website
                </a>
              </p>
            )}
          </div>
          
          <div>
            <h2 className="text-xl font-semibold mb-2">Location</h2>
            <div className="h-64 bg-gray-200 rounded">
              {bookshop.latitude && bookshop.longitude && (
                <SingleLocationMap 
                  latitude={bookshop.latitude} 
                  longitude={bookshop.longitude}
                />
              )}
            </div>
          </div>
        </div>
        
        <div className="mt-8 text-center">
          <Button
            onClick={() => setLocation('/directory')}
            className="bg-[#2A6B7C] hover:bg-[#2A6B7C]/90 text-white"
          >
            Return to Directory
          </Button>
        </div>
      </div>
    </div>
  );
};

export default DirectBookshopPage;