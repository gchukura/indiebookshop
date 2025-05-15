import React, { useEffect } from 'react';
import { useParams, useLocation } from 'wouter';
import { useQuery } from '@tanstack/react-query';
import { Bookstore as Bookshop, Feature, Event } from '@shared/schema';
import { Button } from '@/components/ui/button';
import SingleLocationMap from '@/components/SingleLocationMap';
import RelatedBookshops from '@/components/RelatedBookshops';

const BookshopDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const [_, setLocation] = useLocation();
  const bookshopId = parseInt(id);

  // Redirect to directory if id is invalid
  useEffect(() => {
    if (isNaN(bookshopId)) {
      setLocation('/directory');
    }
  }, [bookshopId, setLocation]);

  // Fetch bookshop details
  const { data: bookshop, isLoading: isLoadingBookshop, isError: isErrorBookshop } = useQuery<Bookshop>({
    queryKey: [`/api/bookstores/${bookshopId}`],
    enabled: !isNaN(bookshopId),
  });

  // Fetch all features to match with bookshop.featureIds
  const { data: features } = useQuery<Feature[]>({
    queryKey: ["/api/features"],
  });

  // Fetch events for this bookshop
  const { data: events } = useQuery<Event[]>({
    queryKey: [`/api/bookstores/${bookshopId}/events`],
    enabled: !isNaN(bookshopId),
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
        <img 
          src={bookshop.imageUrl || "https://images.unsplash.com/photo-1507842217343-583bb7270b66?ixlib=rb-4.0.3&auto=format&fit=crop&w=1200&h=400"}
          alt={`${bookshop.name} interior panorama`} 
          className="w-full h-full object-cover" 
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
                  {/* Gallery images would be loaded from API in a real implementation */}
                  <img src="https://pixabay.com/get/g19250fbdac2034d9a52598452a015110ca00e8a72f6f106864355fe192e17a2f7b06bb3391d499dc2b825b670440e97c837b67954aaaa898a198fa05df311386_1280.jpg" alt="Bookstore interior shelves" className="rounded-md h-40 w-full object-cover" />
                  <img src="https://images.unsplash.com/photo-1524578271613-d550eacf6090?ixlib=rb-4.0.3&auto=format&fit=crop&w=300&h=200" alt="Book display with staff recommendations" className="rounded-md h-40 w-full object-cover" />
                  <img src="https://images.unsplash.com/photo-1513475382585-d06e58bcb0e0?ixlib=rb-4.0.3&auto=format&fit=crop&w=300&h=200" alt="Reading area with comfortable seating" className="rounded-md h-40 w-full object-cover" />
                  <img src="https://pixabay.com/get/gad7ae5ca8d3c20e6ea7d3000b277b675a63c751be2dad2863a5d5f792c8694ae9eda1dd7a4da67c8050e92d6d9e65616ab0e5d77451a37f6824bd02c471550ed_1280.jpg" alt="Bookstore storefront" className="rounded-md h-40 w-full object-cover" />
                  <img src="https://pixabay.com/get/ge0dbb377908f4d4cf2abc1fb59b7bbebce8f79c3fc968b875fb589c86fa09193b24c436494cf183cb26093951597295d7e6f938ef23f48dbe21fdbb8e4ca8961_1280.jpg" alt="Café area with customers" className="rounded-md h-40 w-full object-cover" />
                  <img src="https://pixabay.com/get/g8bf46861013f9985b53e992bfae870fb41e446b54a69402db4a287ead0c05467b3e92ea76bd39bebfc06fdba42143d720a995d603858b2cd3c4f461b441a6802_1280.jpg" alt="Author event with audience" className="rounded-md h-40 w-full object-cover" />
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