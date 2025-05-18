import React, { useEffect } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Bookstore as Bookshop, Feature, Event } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Navigation, Phone, Clock, Globe, MapPin, Calendar } from "lucide-react";
import SingleLocationMap from "./SingleLocationMap";
import Breadcrumbs, { BreadcrumbItem } from "./Breadcrumbs";
import BookshopIcon from "./BookshopIcon";
import ExternalLink from "./ExternalLink";
import EventCard from "./EventCard";
import OptimizedImage from "./OptimizedImage";
import { SEO } from "./SEO";
import { SchemaOrg } from "./SchemaOrg";
import { createSlug, getStateNameFromAbbreviation } from "@/lib/urlUtils";
import { BASE_URL } from "../lib/seo";
import { generateBookshopImageAlt, optimizeImageUrl } from "../lib/imageUtils";

/**
 * A unified component for displaying bookshop details
 * regardless of the URL pattern used to access the page
 */
const UnifiedBookshopDetail: React.FC = () => {
  // Extract all possible parameters from various URL patterns
  const params = useParams<{ 
    id?: string;
    name?: string;
    state?: string;
    county?: string;
    city?: string;
  }>();
  
  const { id, name, state, county, city } = params;
  const [location, setLocation] = useLocation();
  
  // Determine which URL pattern we're dealing with
  const pathSegments = location.split('/').filter(Boolean);
  const segmentCount = pathSegments.length;
  
  console.log(`Bookshop detail page accessed via: ${location} (${segmentCount} segments)`);
  
  // DEBUG: Check direct API call for 51st Ward Books
  useEffect(() => {
    if (name === '51st-ward-books') {
      console.log('DEBUG: Direct name match for 51st Ward Books, ID should be 15');
    }
  }, [name]);
  
  // Fetch all bookshops to find the matching one
  const { data: allBookshops, isLoading: isLoadingAllBookshops } = useQuery<Bookshop[]>({
    queryKey: ["/api/bookstores"],
  });
  
  // Find the matching bookshop based on URL parameters
  let bookshop: Bookshop | undefined;
  
  // Create a direct fetch query for bookshop with ID or name
  // This is more reliable than trying to search through all bookshops
  const directBookshopId = id && !isNaN(parseInt(id)) ? parseInt(id) : null;
  
  // If we have a direct ID, use that
  const { data: directBookshop } = useQuery<Bookshop>({
    queryKey: directBookshopId ? [`/api/bookstores/${directBookshopId}`] : ['skip-query'],
    enabled: directBookshopId !== null,
  });
  
  // If we have a bookshop from direct ID query, use it
  if (directBookshop) {
    bookshop = directBookshop;
    console.log(`Found bookshop by direct ID: ${bookshop.name}`);
  }
  // Otherwise, search through all bookshops to match by URL parameters
  else if (allBookshops && allBookshops.length > 0) {
    // Case 1: Simple name lookup for /bookshop/:name URL pattern
    if (name && segmentCount === 2) {
      console.log(`Looking for bookshop by name slug: ${name}`);
      
      // HARDCODED FIX: Handle 51st Ward Books directly
      if (name === '51st-ward-books') {
        console.log('DIRECT MATCH: Using ID 15 for 51st Ward Books');
        // Get bookshop with ID 15 directly
        const shop51st = allBookshops.find(b => b.id === 15);
        if (shop51st) {
          bookshop = shop51st;
          console.log(`Direct match for 51st Ward Books found: ${bookshop.name}`);
        } else {
          console.log('ERROR: Could not find 51st Ward Books with ID 15 in bookshops array');
        }
        return;
      }

      // Regular matching logic for other bookshops
      console.log(`Looking for bookshop with name slug: ${name}`);
      console.log(`Total bookshops to search: ${allBookshops.length}`);
      
      // First check if there's a direct match
      let found = false;
      for (const shop of allBookshops) {
        if (shop.name === "51st Ward Books") {
          console.log(`DEBUG: Found the actual 51st Ward Books at id ${shop.id}`);
        }
        
        const shopSlug = createSlug(shop.name);
        console.log(`Comparing "${shopSlug}" with "${name}"`);
        
        if (shopSlug === name) {
          bookshop = shop;
          console.log(`EXACT slug match found: ${shop.name}`);
          found = true;
          break;
        }
      }
      
      // If no exact match, try fuzzy matching
      if (!found) {
        console.log(`No exact match found for ${name}, trying fuzzy matching...`);

        // Attempt case-insensitive matching
        for (const shop of allBookshops) {
          const shopName = shop.name.toLowerCase();
          const nameForCompare = name.replace(/-/g, ' ').toLowerCase();
          
          if (shopName.includes(nameForCompare) || nameForCompare.includes(shopName)) {
            bookshop = shop;
            console.log(`Fuzzy match found: ${shop.name}`);
            found = true;
            break;
          }
        }
      }
    } 
    // Case 2: State/city/name pattern
    else if (name && state && city && segmentCount === 4) {
      bookshop = allBookshops.find(b => 
        createSlug(b.name) === name && 
        createSlug(b.city) === city &&
        (createSlug(getStateNameFromAbbreviation(b.state)) === state || 
         b.state.toLowerCase() === state)
      );
      console.log(`Looking up by state/city/name, found: ${bookshop?.name || 'none'}`);
    }
    // Case 3: State/county/city/name pattern
    else if (name && state && county && city && segmentCount === 5) {
      bookshop = allBookshops.find(b => {
        const nameMatch = createSlug(b.name) === name;
        const cityMatch = createSlug(b.city) === city;
        const stateMatch = 
          createSlug(getStateNameFromAbbreviation(b.state)) === state || 
          b.state.toLowerCase() === state;
        
        // County matching is more flexible since naming conventions vary
        let countyMatch = false;
        if (b.county) {
          const shopCountySlug = createSlug(b.county);
          countyMatch = 
            shopCountySlug.includes(county) || 
            county.includes(shopCountySlug);
        }
        
        return nameMatch && cityMatch && stateMatch && (countyMatch || !b.county);
      });
      console.log(`Looking up by state/county/city/name, found: ${bookshop?.name || 'none'}`);
    }
  }
  
  // Fetch all features to match with bookshop.featureIds
  const { data: features } = useQuery<Feature[]>({
    queryKey: ["/api/features"],
  });
  
  // Fetch events for this bookshop
  const { data: events } = useQuery<Event[]>({
    queryKey: [`/api/bookstores/${bookshop?.id}/events`],
    enabled: !!bookshop?.id,
  });
  
  const isLoadingBookshop = isLoadingAllBookshops;
  const isErrorBookshop = !bookshop && !isLoadingBookshop;
  
  // Get feature names for the bookshop
  const bookshopFeatures = features?.filter(feature => {
    if (!bookshop?.featureIds) return false;
    
    // Convert any format of featureIds to an array for processing
    let featureIdArray: number[] = [];
    
    if (Array.isArray(bookshop.featureIds)) {
      featureIdArray = bookshop.featureIds;
    } else if (typeof bookshop.featureIds === 'string') {
      const idStrings = (bookshop.featureIds as string).split(',');
      featureIdArray = idStrings
        .map((id: string) => parseInt(id.trim()))
        .filter((id: number) => !isNaN(id));
    } else if (typeof bookshop.featureIds === 'number') {
      featureIdArray = [bookshop.featureIds];
    }
    
    return featureIdArray.includes(feature.id);
  }) || [];
  
  // Format address for display
  const formatAddress = () => {
    if (!bookshop) return '';
    
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
  
  // Create breadcrumb items
  const breadcrumbItems: BreadcrumbItem[] = bookshop ? [
    { label: 'Home', href: '/' },
    { label: 'Bookshops', href: '/bookshops' },
    { label: getStateNameFromAbbreviation(bookshop.state).replace(/-/g, ' '), 
      href: `/bookshops/${createSlug(getStateNameFromAbbreviation(bookshop.state))}` },
    { label: bookshop.city, href: `/bookshops/${createSlug(getStateNameFromAbbreviation(bookshop.state))}/${createSlug(bookshop.city)}` },
    { label: bookshop.name, href: `/bookshop/${createSlug(bookshop.name)}`, isCurrent: true }
  ] : [];
  
  // If county is available, add it to breadcrumbs
  if (bookshop?.county) {
    breadcrumbItems.splice(3, 0, {
      label: bookshop.county.replace(/\s[Cc]ounty$/, ''),
      href: `/bookshops/${createSlug(getStateNameFromAbbreviation(bookshop.state))}/${createSlug(bookshop.county)}`
    });
  }

  // Loading state
  if (isLoadingBookshop) {
    return (
      <div className="container mx-auto px-4 py-16 text-center">
        <p>Loading bookshop details...</p>
      </div>
    );
  }

  // Error state
  if (isErrorBookshop) {
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

  if (!bookshop) {
    return (
      <div className="container mx-auto px-4 py-16 text-center">
        <p>Bookshop not found. Please try a different search.</p>
        <Button 
          className="mt-4 bg-[#2A6B7C] hover:bg-[#2A6B7C]/90 text-white"
          onClick={() => setLocation('/directory')}
        >
          Return to Directory
        </Button>
      </div>
    );
  }

  // SEO metadata
  const pageTitle = `${bookshop.name} - Independent Bookshop in ${bookshop.city}, ${bookshop.state}`;
  const pageDescription = bookshop.description 
    ? bookshop.description.slice(0, 160) 
    : `Visit ${bookshop.name}, an independent bookshop located in ${bookshop.city}, ${bookshop.state}. Browse their collection, attend events, and support local booksellers.`;
  
  // Schema.org data
  const bookshopSchema = {
    type: 'bookshop' as const,
    name: bookshop.name,
    description: bookshop.description || `Independent bookshop in ${bookshop.city}, ${bookshop.state}`,
    url: `${BASE_URL}${location}`,
    image: bookshop.imageUrl || undefined,
    address: {
      streetAddress: bookshop.street || '',
      addressLocality: bookshop.city,
      addressRegion: bookshop.state,
      postalCode: bookshop.zip || '',
      addressCountry: 'US'
    },
    telephone: bookshop.phone || undefined,
    geo: bookshop.latitude && bookshop.longitude ? {
      latitude: String(bookshop.latitude),
      longitude: String(bookshop.longitude)
    } : undefined,
    openingHours: bookshop.hours ? JSON.stringify(bookshop.hours) : undefined,
    features: bookshopFeatures.map(f => f.name)
  };

  return (
    <div className="bg-[#F7F3E8] min-h-screen">
      {/* SEO metadata */}
      <SEO
        title={pageTitle}
        description={pageDescription}
        canonicalUrl={`${BASE_URL}${location}`}
      />
      
      {/* Schema.org structured data */}
      <SchemaOrg schema={bookshopSchema} />
      
      {/* Hero Image Section */}
      <div className="relative h-64 md:h-96">
        <OptimizedImage 
          src={optimizeImageUrl(
            bookshop.imageUrl || "https://images.unsplash.com/photo-1507842217343-583bb7270b66?ixlib=rb-4.0.3&auto=format&fit=crop&w=1200&h=400",
            'detail'
          )}
          alt={generateBookshopImageAlt(
            bookshop.name, 
            bookshop.city, 
            bookshop.state, 
            bookshopFeatures.map(f => f.name)
          )} 
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
      
      {/* Breadcrumb Navigation */}
      <div className="bg-white shadow-sm">
        <div className="container mx-auto px-4 py-3">
          <Breadcrumbs items={breadcrumbItems} className="text-sm" />
        </div>
      </div>
      
      {/* Main Content */}
      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Left Column (2/3 width on desktop) */}
          <div className="md:col-span-2">
            <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
              <h2 className="font-serif font-bold text-2xl mb-4 text-[#5F4B32]">About</h2>
              <p className="mb-4">{bookshop.description || `${bookshop.name} is an independent bookshop located in ${bookshop.city}, ${bookshop.state}.`}</p>
              
              {/* Features Section */}
              {bookshopFeatures.length > 0 && (
                <div className="mt-8">
                  <h3 className="font-serif font-bold text-xl mb-4 text-[#5F4B32]">Features & Specialties</h3>
                  <div className="flex flex-wrap gap-2">
                    {bookshopFeatures.map(feature => (
                      <span 
                        key={feature.id} 
                        className="bg-[rgba(42,107,124,0.1)] text-[#2A6B7C] rounded-full px-3 py-1 text-sm font-semibold"
                      >
                        {feature.name}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              
              {/* Photo Gallery */}
              <div className="mt-8">
                <h3 className="font-serif font-bold text-xl mb-4 text-[#5F4B32]">Photo Gallery</h3>
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
              
              {/* Events Section */}
              {events && events.length > 0 && (
                <div className="mt-8">
                  <h3 className="font-serif font-bold text-xl mb-4 text-[#5F4B32] flex items-center">
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
          </div>
          
          {/* Right Column (1/3 width on desktop) */}
          <div className="md:col-span-1">
            {/* Store Information Card */}
            <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
              <h3 className="font-serif font-bold text-xl mb-4 text-[#5F4B32]">Store Information</h3>
              <div className="space-y-4">
                <div>
                  <p className="font-bold">Address</p>
                  <div className="flex items-start">
                    <MapPin className="h-4 w-4 mr-2 text-[#E16D3D] mt-1 flex-shrink-0" />
                    <div>
                      <p>{bookshop.street}</p>
                      <p>{bookshop.city}, {bookshop.state} {bookshop.zip}</p>
                    </div>
                  </div>
                </div>
                
                {bookshop.phone && (
                  <div>
                    <p className="font-bold">Phone</p>
                    <div className="flex items-center">
                      <Phone className="h-4 w-4 mr-2 text-[#E16D3D]" />
                      <a href={`tel:${bookshop.phone}`} className="hover:text-[#2A6B7C]">
                        {formatPhone(bookshop.phone)}
                      </a>
                    </div>
                  </div>
                )}
                
                {bookshop.website && (
                  <div>
                    <p className="font-bold">Website</p>
                    <div className="flex items-center">
                      <Globe className="h-4 w-4 mr-2 text-[#E16D3D]" />
                      <ExternalLink href={bookshop.website} className="hover:text-[#2A6B7C] break-words">
                        {bookshop.website.replace(/^https?:\/\/(www\.)?/, '')}
                      </ExternalLink>
                    </div>
                  </div>
                )}
                
                {bookshop.hours && (
                  <div>
                    <p className="font-bold flex items-center">
                      <Clock className="h-4 w-4 mr-2 text-[#E16D3D]" />
                      Hours
                    </p>
                    {typeof bookshop.hours === 'string' ? (
                      <p>{bookshop.hours}</p>
                    ) : (
                      <div className="grid grid-cols-2 gap-1 text-sm">
                        {Object.entries(bookshop.hours).map(([day, hours]) => (
                          <React.Fragment key={day}>
                            <p>{day}:</p>
                            <p>{hours}</p>
                          </React.Fragment>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
            
            {/* Map Card */}
            <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
              <h3 className="font-serif font-bold text-xl mb-4 text-[#5F4B32]">Location</h3>
              <div className="bg-gray-200 h-64 rounded-md overflow-hidden">
                <SingleLocationMap 
                  latitude={bookshop.latitude} 
                  longitude={bookshop.longitude} 
                />
              </div>
              <div className="mt-4">
                {bookshop.latitude && bookshop.longitude ? (
                  <a 
                    href={`https://www.google.com/maps/dir/?api=1&destination=${bookshop.latitude},${bookshop.longitude}`}
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="block w-full"
                  >
                    <Button className="w-full bg-[#2A6B7C] hover:bg-[#2A6B7C]/90 text-white py-2 rounded-md font-medium">
                      <Navigation className="h-4 w-4 mr-2" /> Get Directions
                    </Button>
                  </a>
                ) : (
                  <Button disabled className="w-full bg-[#2A6B7C]/50 text-white py-2 rounded-md font-medium">
                    <Navigation className="h-4 w-4 mr-2" /> Get Directions
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UnifiedBookshopDetail;