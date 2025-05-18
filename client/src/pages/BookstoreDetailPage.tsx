import React, { useEffect, useMemo } from 'react';
import { useParams, useLocation } from 'wouter';
import { useQuery } from '@tanstack/react-query';
import { Bookstore, Feature, Event } from '@shared/schema';
import { Button } from '@/components/ui/button';
import SingleLocationMap from '@/components/SingleLocationMap';
import { SEO } from '../components/SEO';
import { 
  BASE_URL, 
  generateDescription,
  DESCRIPTION_TEMPLATES
} from '../lib/seo';

// Export both component names to support dual naming pattern in the codebase
export const BookstoreDetailPage = BookshopDetailPage;
export const BookshopDetailPage = () => {
  // Extract all possible URL parameters
  const params = useParams<{ 
    id?: string;
    name?: string;
    state?: string;
    county?: string;
    city?: string;
  }>();
  const { id, name, state, county, city } = params;
  const [location, setLocation] = useLocation();
  
  // Get the path segments to figure out which URL pattern we're using
  const pathSegments = location.split('/').filter(Boolean);
  const segmentCount = pathSegments.length;
  
  // If we have a numeric ID, use it directly
  const directBookshopId = id && !isNaN(parseInt(id)) ? parseInt(id) : undefined;
  
  // Get all bookshops to lookup by name if needed
  const { data: allBookshops } = useQuery<Bookstore[]>({
    queryKey: ["/api/bookstores"],
    enabled: !!name && !directBookshopId, // Only needed when looking up by name
  });

  // Redirect to directory if id is invalid (when using numeric ID mode)
  useEffect(() => {
    // Only redirect if we were trying to use a numeric ID but failed
    if (id && isNaN(parseInt(id))) {
      setLocation('/directory');
    }
  }, [id, setLocation]);

  // Fetch bookshop details - explicitly log the query to debug
  console.log(`Fetching bookshop with ID: ${bookshopId}`);
  const { data: bookshop, isLoading: isLoadingBookshop, isError: isErrorBookshop } = useQuery<Bookstore>({
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
  
  // SEO metadata - only generate when bookshop data is available
  const seoTitle = useMemo(() => {
    if (!bookshop) return "Bookshop Details | IndieBookShop.com";
    return `${bookshop.name} | Independent Bookshop in ${bookshop.city}, ${bookshop.state}`;
  }, [bookshop]);
  
  const seoDescription = useMemo(() => {
    if (!bookshop) return "";
    return generateDescription(DESCRIPTION_TEMPLATES.detail, {
      name: bookshop.name,
      city: bookshop.city,
      state: bookshop.state
    });
  }, [bookshop]);
  
  const seoKeywords = useMemo(() => {
    if (!bookshop) return [];
    
    // Create base keywords
    const keywords = [
      `${bookshop.name}`,
      `${bookshop.name} bookshop`,
      `${bookshop.name} bookstore`,
      `independent bookshop ${bookshop.city}`,
      `independent bookstore ${bookshop.city}`,
      `indie bookshop ${bookshop.city}`,
      `bookshops in ${bookshop.city}`,
      `bookstores in ${bookshop.city}`,
      `${bookshop.city} ${bookshop.state} bookshops`,
      `independent bookshops ${bookshop.state}`
    ];
    
    // Add feature-specific keywords
    bookshopFeatures.forEach(feature => {
      keywords.push(`${bookshop.name} ${feature.name.toLowerCase()}`);
      keywords.push(`${feature.name.toLowerCase()} bookshops in ${bookshop.city}`);
    });
    
    return keywords;
  }, [bookshop, bookshopFeatures]);
  
  const canonicalUrl = useMemo(() => {
    if (!bookshop) return "";
    return `${BASE_URL}/bookshop/${bookshop.id}`;
  }, [bookshop]);
  
  // Used for ogImage, ensures we handle null values correctly
  const getImageUrl = useMemo(() => {
    return bookshop?.imageUrl || undefined;
  }, [bookshop]);

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
      {/* SEO Component */}
      <SEO 
        title={seoTitle}
        description={seoDescription}
        keywords={seoKeywords}
        canonicalUrl={canonicalUrl}
        ogImage={getImageUrl}
      />
      
      <div className="relative h-64 md:h-96">
        <img 
          src={bookshop.imageUrl || "https://images.unsplash.com/photo-1507842217343-583bb7270b66?ixlib=rb-4.0.3&auto=format&fit=crop&w=1200&h=400"}
          alt={`${bookshop.name} - independent bookshop in ${bookshop.city}, ${bookshop.state}`} 
          className="w-full h-full object-cover" 
        />
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-4">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <h1 className="text-white text-2xl md:text-4xl font-serif font-bold">{bookshop.name} | Independent Bookshop in {bookshop.city}</h1>
            <p className="text-white/90 text-sm md:text-base">{bookshop.city}, {bookshop.state} • Indie Bookstore</p>
          </div>
        </div>
      </div>
      
      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="md:col-span-2">
            <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
              <h2 className="font-serif font-bold text-2xl mb-4">About {bookshop.name} - Independent Bookshop in {bookshop.city}</h2>
              <p className="mb-4">{bookshop.description}</p>
              <p className="mb-6 text-gray-700">
                {bookshop.name} is a cherished independent bookshop located in {bookshop.city}, {bookshop.state}. 
                As a local indie bookstore, we provide a curated selection of books and a unique shopping 
                experience that online retailers simply can't match.
              </p>
              
              <div className="mt-8">
                <h3 className="font-serif font-bold text-xl mb-4">Specialty Areas & Features</h3>
                <p className="mb-3 text-gray-700">
                  {bookshop.name} specializes in the following areas and offers these features to our community:
                </p>
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
    </div>
  );
};

export default BookshopDetailPage;
