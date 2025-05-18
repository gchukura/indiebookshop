import { useEffect } from 'react';
import { useParams, useLocation } from 'wouter';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Bookstore as Bookshop, Feature, Event } from '@shared/schema';
import { createSlug, getStateNameFromAbbreviation } from '@/lib/urlUtils';
import SingleLocationMap from '@/components/SingleLocationMap';
import BookshopIcon from '@/components/BookshopIcon';
import ExternalLink from '@/components/ExternalLink';
import EventCard from '@/components/EventCard';
import { MapPin, Clock, Phone, Globe, Mail, Calendar } from 'lucide-react';
import { SEO } from '@/components/SEO';
import { BASE_URL } from '@/lib/seo';

const SEOBookshopDetailPage = () => {
  // Extract parameters from the URL path
  const params = useParams<{ 
    state?: string,
    county?: string,
    city?: string,
    name: string,
    id?: string
  }>();
  
  const { state, county, city, name, id } = params;
  const [location, setLocation] = useLocation();
  
  // Extract path segments to determine the URL pattern
  const pathSegments = location.split('/').filter(Boolean);
  const isBookshopPath = pathSegments[0] === 'bookshop';
  const segmentCount = pathSegments.length;
  
  console.log(`Bookshop detail page: URL has ${segmentCount} segments, looking for name: ${name}`);
  
  // Find bookshop by URL parameters
  const { data: allBookshops, isLoading: isLoadingAllBookshops } = useQuery<Bookshop[]>({
    queryKey: ["/api/bookstores"],
  });
  
  // Find the matching bookshop based on URL pattern
  let matchedBookshop: Bookshop | undefined;
  
  if (allBookshops) {
    if (id && !isNaN(parseInt(id))) {
      // ID-based lookup (legacy pattern)
      matchedBookshop = allBookshops.find(shop => shop.id === parseInt(id));
      console.log(`Looking up by ID ${id}, found: ${matchedBookshop?.name || 'none'}`);
    } 
    else if (segmentCount === 2) {
      // Direct name-based lookup: /bookshop/:name
      matchedBookshop = allBookshops.find(shop => createSlug(shop.name) === name);
      console.log(`Looking up by name ${name}, found: ${matchedBookshop?.name || 'none'}`);
    }
    else if (segmentCount === 4 && state && city) {
      // Standard geography pattern: /bookshop/:state/:city/:name
      matchedBookshop = allBookshops.find(shop => 
        createSlug(shop.name) === name && 
        createSlug(shop.city) === city && 
        (createSlug(getStateNameFromAbbreviation(shop.state)) === state || shop.state.toLowerCase() === state)
      );
      console.log(`Looking up by state/city/name, found: ${matchedBookshop?.name || 'none'}`);
    }
    else if (segmentCount === 5 && state && county && city) {
      // County-enhanced pattern: /bookshop/:state/:county/:city/:name
      matchedBookshop = allBookshops.find(shop => {
        const shopNameMatch = createSlug(shop.name) === name;
        const shopCityMatch = createSlug(shop.city) === city;
        const shopStateMatch = 
          createSlug(getStateNameFromAbbreviation(shop.state)) === state || 
          shop.state.toLowerCase() === state;
        
        // County matching is more flexible
        let shopCountyMatch = false;
        if (shop.county) {
          const shopCountySlug = createSlug(shop.county);
          shopCountyMatch = 
            shopCountySlug.includes(county) || 
            county.includes(shopCountySlug);
        }
        
        return shopNameMatch && shopCityMatch && shopStateMatch && 
               (shopCountyMatch || !shop.county);
      });
      console.log(`Looking up by state/county/city/name, found: ${matchedBookshop?.name || 'none'}`);
    }
  }
  
  // Use the matched bookshop directly
  const bookshop = matchedBookshop;
  const isLoadingBookshop = isLoadingAllBookshops;
  const isErrorBookshop = false;

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

  // Format address for display
  const formatAddress = () => {
    const parts = [];
    if (bookshop.street) parts.push(bookshop.street);
    if (bookshop.city && bookshop.state) parts.push(`${bookshop.city}, ${bookshop.state} ${bookshop.zip || ''}`);
    return parts.join(', ');
  };

  // Format phone for display
  const formatPhone = (phone: string | null) => {
    if (!phone) return null;
    
    // Remove non-numeric characters
    const digits = phone.replace(/\D/g, '');
    
    // Format based on length
    if (digits.length === 10) {
      return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
    }
    return phone;
  };
  
  // Helper function for contact info display
  const getContactInfo = () => {
    return null; // No additional contact info display logic needed currently
  };

  // SEO metadata
  const pageTitle = `${bookshop.name} - Independent Bookshop in ${bookshop.city}, ${bookshop.state}`;
  
  const pageDescription = bookshop.description 
    ? bookshop.description.slice(0, 160) 
    : `Visit ${bookshop.name}, an independent bookshop located in ${bookshop.city}, ${bookshop.state}. Browse their collection, attend events, and support local booksellers.`;
  
  const pageKeywords = [
    bookshop.name,
    `bookstore in ${bookshop.city}`,
    `bookshop in ${bookshop.state}`,
    'independent bookstore',
    'indie bookshop',
    'local bookstore',
    ...bookshopFeatures.map(f => f.name.toLowerCase()),
    bookshop.city.toLowerCase(),
    bookshop.state.toLowerCase(),
    'books',
    'reading',
    'literature'
  ];

  const canonicalUrl = `${BASE_URL}${location}`;

  return (
    <>
      <SEO
        title={pageTitle}
        description={pageDescription}
        keywords={pageKeywords}
        canonicalUrl={canonicalUrl}
      />
      
      <div className="bg-white">
        {/* Bookshop Header Section */}
        <div className="bg-[#F7F3E8] py-8 md:py-12">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
              {/* Bookshop Image/Icon */}
              <div className="w-32 h-32 md:w-40 md:h-40 bg-white rounded-lg shadow-md flex items-center justify-center overflow-hidden flex-shrink-0">
                {bookshop.imageUrl ? (
                  <img 
                    src={bookshop.imageUrl} 
                    alt={bookshop.name} 
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <BookshopIcon size={100} />
                )}
              </div>
              
              {/* Bookshop Info */}
              <div className="flex-1">
                <h1 className="text-3xl md:text-4xl font-serif font-bold text-[#5F4B32] mb-2">{bookshop.name}</h1>
                <div className="flex items-center text-gray-700 mb-2">
                  <MapPin className="h-4 w-4 mr-1 text-[#E16D3D]" />
                  <span>{formatAddress()}</span>
                </div>
                
                {bookshop.phone && (
                  <div className="flex items-center text-gray-700 mb-2">
                    <Phone className="h-4 w-4 mr-1 text-[#E16D3D]" />
                    <a href={`tel:${bookshop.phone}`} className="hover:text-[#2A6B7C]">
                      {formatPhone(bookshop.phone)}
                    </a>
                  </div>
                )}
                
                {bookshop.website && (
                  <div className="flex items-center text-gray-700 mb-2">
                    <Globe className="h-4 w-4 mr-1 text-[#E16D3D]" />
                    <ExternalLink 
                      href={bookshop.website} 
                      className="hover:text-[#2A6B7C]"
                    >
                      {bookshop.website.replace(/^https?:\/\/(www\.)?/, '')}
                    </ExternalLink>
                  </div>
                )}
                
                {/* Features Tags */}
                {bookshopFeatures.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-3">
                    {bookshopFeatures.map(feature => (
                      <span 
                        key={feature.id} 
                        className="bg-[rgba(42,107,124,0.1)] text-[#2A6B7C] rounded-full px-3 py-1 text-sm font-semibold"
                      >
                        {feature.name}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
        
        {/* Main Content */}
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
            {/* Left Column - About */}
            <div className="lg:col-span-2">
              <h2 className="text-2xl font-serif font-bold text-[#5F4B32] mb-4">About {bookshop.name}</h2>
              <div className="prose max-w-none mb-8">
                {bookshop.description ? (
                  <p>{bookshop.description}</p>
                ) : (
                  <p>
                    {bookshop.name} is an independent bookshop located in {bookshop.city}, {bookshop.state}. 
                    Visit them to discover a curated selection of books and support your local community of readers.
                  </p>
                )}
              </div>
              
              {/* Hours Section (if available) */}
              {bookshop.hours && (
                <div className="mb-8">
                  <h3 className="text-xl font-serif font-bold text-[#5F4B32] mb-3 flex items-center">
                    <Clock className="h-5 w-5 mr-2 text-[#E16D3D]" />
                    Hours
                  </h3>
                  <div className="bg-[rgba(79,105,95,0.05)] p-4 rounded-md">
                    <pre className="whitespace-pre-wrap font-sans text-gray-700">
                      {typeof bookshop.hours === 'string' 
                        ? bookshop.hours 
                        : bookshop.hours ? JSON.stringify(bookshop.hours, null, 2) : 'Hours not available'}
                    </pre>
                  </div>
                </div>
              )}
              
              {/* Events Section */}
              {events && events.length > 0 && (
                <div className="mb-8">
                  <h3 className="text-xl font-serif font-bold text-[#5F4B32] mb-4 flex items-center">
                    <Calendar className="h-5 w-5 mr-2 text-[#E16D3D]" />
                    Upcoming Events
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {events.map(event => (
                      <EventCard key={event.id} event={event} />
                    ))}
                  </div>
                </div>
              )}
            </div>
            
            {/* Right Column - Map & Info */}
            <div>
              {/* Map */}
              <div className="bg-white rounded-lg shadow-md overflow-hidden mb-8">
                <div className="h-64">
                  {bookshop.latitude && bookshop.longitude ? (
                    <SingleLocationMap 
                      latitude={bookshop.latitude} 
                      longitude={bookshop.longitude} 
                    />
                  ) : (
                    <div className="h-full bg-gray-100 flex items-center justify-center">
                      <p className="text-gray-500">No map location available</p>
                    </div>
                  )}
                </div>
              </div>
              
              {/* Contact Info Card */}
              <div className="bg-white rounded-lg shadow-md overflow-hidden">
                <div className="bg-[#2A6B7C] text-white px-5 py-3">
                  <h3 className="font-serif font-bold text-lg">Contact Information</h3>
                </div>
                <div className="p-5">
                  <div className="mb-4">
                    <h4 className="font-bold text-[#5F4B32] mb-1">Address</h4>
                    <p className="text-gray-700">{formatAddress()}</p>
                  </div>
                  
                  {bookshop.phone && (
                    <div className="mb-4">
                      <h4 className="font-bold text-[#5F4B32] mb-1">Phone</h4>
                      <p className="text-gray-700">
                        <a href={`tel:${bookshop.phone}`} className="hover:text-[#2A6B7C]">
                          {formatPhone(bookshop.phone)}
                        </a>
                      </p>
                    </div>
                  )}
                  
                    {/* Email section removed as it's not part of the current schema */}
                  
                  {bookshop.website && (
                    <div>
                      <h4 className="font-bold text-[#5F4B32] mb-1">Website</h4>
                      <p className="text-gray-700">
                        <ExternalLink href={bookshop.website} className="hover:text-[#2A6B7C]">
                          {bookshop.website.replace(/^https?:\/\/(www\.)?/, '')}
                        </ExternalLink>
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default SEOBookshopDetailPage;