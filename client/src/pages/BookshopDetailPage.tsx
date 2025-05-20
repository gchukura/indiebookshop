import React, { useEffect } from 'react';
import { useParams, useLocation } from 'wouter';
import { useQuery } from '@tanstack/react-query';
import { Bookstore as Bookshop, Feature, Event } from '@shared/schema';
import { Button } from '@/components/ui/button';
import SingleLocationMap from '@/components/SingleLocationMap';
import OptimizedImage from '@/components/OptimizedImage';
import RelatedBookshops from '@/components/RelatedBookshops';

const BookshopDetailPage = () => {
  const { idslug } = useParams<{ idslug: string }>();
  const [_, setLocation] = useLocation();
  
  // With our new approach, the URL parameter is just the bookshop slug
  // We don't need to extract an ID anymore
  const bookshopSlug = idslug || '';

  // Fetch bookshop details by slug
  const { 
    data: bookshop, 
    isLoading: isLoadingBookshop, 
    isError: isErrorBookshop 
  } = useQuery<Bookshop>({
    queryKey: [`/api/bookstores/by-slug/${bookshopSlug}`],
    enabled: !!bookshopSlug,
    retry: 1,
    gcTime: 0,
    staleTime: 10 * 60 * 1000, // 10 minutes
    throwOnError: false
  });
  
  // Redirect if bookshop not found
  useEffect(() => {
    if ((isErrorBookshop || (!isLoadingBookshop && !bookshop)) && bookshopSlug) {
      setLocation('/directory');
    }
  }, [isErrorBookshop, isLoadingBookshop, bookshop, bookshopSlug, setLocation]);

  // Fetch all features to match with bookshop.featureIds
  const { data: features } = useQuery<Feature[]>({
    queryKey: ["/api/features"],
  });

  // Fetch events for this bookshop
  const { data: events } = useQuery<Event[]>({
    queryKey: [`/api/bookstores/${bookshop?.id}/events`],
    enabled: !!bookshop?.id,
  });

  // Get feature names for the bookshop
  const bookshopFeatures = features?.filter(feature => 
    bookshop?.featureIds?.includes(feature.id) || false
  ) || [];

  if (isLoadingBookshop) {
    return (
      <div className="container mx-auto px-4 py-16 text-center">
        <p>Loading bookshop details...</p>
      </div>
    );
  }

  if (isErrorBookshop || !bookshop) {
    return (
      <div className="container mx-auto px-4 py-16 text-center">
        <p>Error loading bookshop. The bookshop may not exist or there was a problem with the connection.</p>
        <Button 
          className="mt-4 bg-[#2A6B7C] hover:bg-[#2A6B7C]/90 text-white"
          onClick={() => setLocation('/directory')}
        >
          Return to Directory
        </Button>
      </div>
    );
  }

  return (
    <div className="bg-[#F7F3E8] min-h-screen">
      <div className="relative h-64 md:h-96">
        <OptimizedImage 
          src={bookshop.imageUrl || "https://images.unsplash.com/photo-1507842217343-583bb7270b66?ixlib=rb-4.0.3&auto=format&fit=crop&w=1200&h=400"}
          alt={`${bookshop.name} interior panorama in ${bookshop.city}, ${bookshop.state}`} 
          className="w-full h-full" 
          objectFit="cover"
          loading="eager"
          sizes="100vw"
          placeholderColor="#f7f3e8"
        />
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-4">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <h1 className="text-white text-2xl md:text-4xl font-serif font-bold">{bookshop.name}</h1>
            <p className="text-white/90 text-sm md:text-base">{bookshop.city}, {bookshop.state}</p>
          </div>
        </div>
      </div>
      
      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="md:col-span-2">
            <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
              <h2 className="font-serif font-bold text-2xl mb-4">About</h2>
              <p className="mb-4">{bookshop.description}</p>
              
              <div className="mt-8">
                <h3 className="font-serif font-bold text-xl mb-4">Features & Specialties</h3>
                <div className="flex flex-wrap gap-2">
                  {bookshopFeatures.map(feature => (
                    <span key={feature.id} className="store-feature-tag bg-[rgba(42,107,124,0.1)] text-[#2A6B7C] rounded-full px-3 py-1 text-xs font-semibold">
                      {feature.name}
                    </span>
                  ))}
                </div>
              </div>
              
              <div className="mt-8">
                <h3 className="font-serif font-bold text-xl mb-4">Photo Gallery</h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {/* Use locally hosted SVG images that we created */}
                  <div className="rounded-md h-40 w-full overflow-hidden bg-gray-100">
                    <img 
                      src={bookshop.imageUrl || "/images/bookshop-interior.svg"} 
                      alt={`${bookshop.name} bookstore interior`}
                      className="h-full w-full object-cover"
                      onError={(e) => {
                        e.currentTarget.src = "/images/bookshop-interior.svg";
                      }}
                    />
                  </div>
                  <div className="rounded-md h-40 w-full overflow-hidden bg-gray-100">
                    <img 
                      src="/images/bookshop-display.svg" 
                      alt={`Book display at ${bookshop.name}`}
                      className="h-full w-full object-cover"
                    />
                  </div>
                  <div className="rounded-md h-40 w-full overflow-hidden bg-gray-100">
                    <img 
                      src="/images/bookshop-reading.svg" 
                      alt={`Reading area at ${bookshop.name}`}
                      className="h-full w-full object-cover"
                    />
                  </div>
                  <div className="rounded-md h-40 w-full overflow-hidden bg-gray-100">
                    <img 
                      src="/images/bookshop-storefront.svg" 
                      alt={`${bookshop.name} storefront`}
                      className="h-full w-full object-cover"
                    />
                  </div>
                  <div className="rounded-md h-40 w-full overflow-hidden bg-gray-100">
                    <img 
                      src="/images/bookshop-cafe.svg" 
                      alt={`Café area at ${bookshop.name}`}
                      className="h-full w-full object-cover"
                    />
                  </div>
                  <div className="rounded-md h-40 w-full overflow-hidden bg-gray-100">
                    <img 
                      src="/images/bookshop-event.svg" 
                      alt={`Author event at ${bookshop.name}`}
                      className="h-full w-full object-cover"
                    />
                  </div>
                </div>
              </div>
              
              {events && events.length > 0 && (
                <div className="mt-8">
                  <h3 className="font-serif font-bold text-xl mb-4">Upcoming Events</h3>
                  <div className="space-y-4">
                    {events.map(event => (
                      <div key={event.id} className="border-l-4 border-[#E16D3D] pl-4">
                        <p className="font-bold">{event.title}</p>
                        <p className="text-sm text-gray-600">{event.date} • {event.time}</p>
                        <p className="text-sm mt-1">{event.description}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
          
          <div className="md:col-span-1">
            <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
              <h3 className="font-serif font-bold text-xl mb-4">Store Information</h3>
              <div className="space-y-4">
                <div>
                  <p className="font-bold">Address</p>
                  <p>{bookshop.street}</p>
                  <p>{bookshop.city}, {bookshop.state} {bookshop.zip}</p>
                </div>
                
                <div>
                  <p className="font-bold">Contact</p>
                  <p>Phone: {bookshop.phone || 'Not available'}</p>
                  <p>Website: {bookshop.website ? (
                    <a href={bookshop.website} target="_blank" rel="noopener noreferrer" className="text-[#2A6B7C] hover:text-[#E16D3D]">
                      {new URL(bookshop.website).hostname}
                    </a>
                  ) : 'Not available'}</p>
                </div>
                
                <div>
                  <p className="font-bold">Hours</p>
                  {bookshop.hours ? (
                    <div className="grid grid-cols-2 gap-1 text-sm">
                      {Object.entries(bookshop.hours).map(([day, hours]) => (
                        <React.Fragment key={day}>
                          <p>{day}:</p>
                          <p>{hours}</p>
                        </React.Fragment>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm">Hours not available</p>
                  )}
                </div>
              </div>
            </div>
            
            <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
              <h3 className="font-serif font-bold text-xl mb-4">Store Location</h3>
              <div className="bg-gray-200 h-64 rounded-md overflow-hidden">
                <SingleLocationMap 
                  latitude={bookshop.latitude} 
                  longitude={bookshop.longitude} 
                />
              </div>

            </div>
          </div>
        </div>
      </div>
      
      {/* Related Bookshops Section - Full Width */}
      <div className="container mx-auto px-4 pb-8">
        <RelatedBookshops currentBookshop={bookshop} />
      </div>
    </div>
  );
};

export default BookshopDetailPage;