import React, { useEffect, useMemo } from 'react';
import { useParams, useLocation } from 'wouter';
import { useQuery } from '@tanstack/react-query';
import { Bookstore as Bookshop, Feature, Event } from '@shared/schema';
import { Button } from '@/components/ui/button';
import SingleLocationMap from '@/components/SingleLocationMap';
import OptimizedImage from '@/components/OptimizedImage';
import RelatedBookshops from '@/components/RelatedBookshops';
import { SEO } from '../components/SEO';
import { 
  BASE_URL, 
  generateDescription,
  DESCRIPTION_TEMPLATES
} from '../lib/seo';
import { generateSlugFromName } from '../lib/linkUtils';
import { logger } from '@/lib/logger';

const BookshopDetailPage = () => {
  const { idslug } = useParams<{ idslug: string }>();
  const [_, setLocation] = useLocation();
  
  // The URL parameter could be a slug or numeric ID
  const bookshopSlug = idslug || '';
  
  // Check if the parameter is a numeric ID (legacy URL)
  const isNumericId = /^\d+$/.test(bookshopSlug);
  
  // Determine which API endpoint to use
  const apiEndpoint = isNumericId 
    ? `/api/bookstores/${bookshopSlug}` 
    : `/api/bookstores/by-slug/${bookshopSlug}`;

  // Fetch bookshop details by slug or ID
  const { 
    data: bookshop, 
    isLoading: isLoadingBookshop, 
    isError: isErrorBookshop,
    error: bookshopError,
    isSuccess: isSuccessBookshop
  } = useQuery<Bookshop>({
    queryKey: [apiEndpoint],
    enabled: !!bookshopSlug,
    retry: 1,
    staleTime: 10 * 60 * 1000, // 10 minutes
    // Don't throw errors - handle them in the component
    throwOnError: false,
  });
  
  // Redirect numeric IDs to slug-based URLs for SEO (canonical URLs)
  // This MUST happen after the bookshop data is loaded successfully
  useEffect(() => {
    // Only redirect if:
    // 1. Query is successful (not loading, not error)
    // 2. We have bookshop data
    // 3. The current URL is a numeric ID
    // 4. We're not already on the correct slug URL
    if (isSuccessBookshop && bookshop && isNumericId && !isLoadingBookshop && !isErrorBookshop) {
      logger.debug('[BookshopDetailPage] Numeric ID detected, redirecting to slug', {
        numericId: bookshopSlug,
        bookshopName: bookshop.name,
        bookshopId: bookshop.id
      });
      
      // Generate the canonical slug-based URL
      const canonicalSlug = generateSlugFromName(bookshop.name);
      
      // Fallback to numeric ID if slug is empty (edge case: all special characters in name)
      const finalSlug = canonicalSlug || String(bookshop.id);
      const canonicalUrl = `/bookshop/${finalSlug}`;
      
      // Only redirect if the current URL is different from the canonical URL
      if (bookshopSlug !== finalSlug) {
        logger.debug('[BookshopDetailPage] Redirecting numeric ID to slug', {
          from: `/bookshop/${bookshopSlug}`,
          to: canonicalUrl
        });
        // Use replace: true to avoid adding to browser history
        setLocation(canonicalUrl, { replace: true });
        return; // Exit early to prevent multiple redirects
      }
    }
  }, [bookshop, isNumericId, bookshopSlug, setLocation, isLoadingBookshop, isSuccessBookshop, isErrorBookshop]);
  
  // Handle errors: Only redirect to directory for slug-based URLs that fail
  // NEVER redirect numeric IDs to directory - they should either:
  // 1. Succeed and redirect to slug (handled above)
  // 2. Fail and show an error message (handled in render)
  useEffect(() => {
    // Only redirect to directory if:
    // 1. There was an error
    // 2. It's NOT a numeric ID (numeric IDs should show error, not redirect)
    // 3. We have a slug to check
    // 4. The query is no longer loading (to avoid race conditions)
    if (isErrorBookshop && !isNumericId && bookshopSlug && !isLoadingBookshop) {
      logger.debug('[BookshopDetailPage] Slug-based URL failed, redirecting to directory', {
        slug: bookshopSlug,
        error: bookshopError
      });
      // If there was an error (like a 500) and it's not a numeric ID redirect,
      // redirect to directory
      setLocation('/directory');
    }
  }, [isErrorBookshop, bookshopSlug, isNumericId, setLocation, isLoadingBookshop, bookshopError]);

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
    
    // Create base keywords - ensure all are strings
    const keywords: string[] = [
      String(bookshop.name || ''),
      `${String(bookshop.name || '')} bookshop`,
      `${String(bookshop.name || '')} bookshop`,
      `independent bookshop ${String(bookshop.city || '')}`,
      `independent bookshop ${String(bookshop.city || '')}`,
      `indie bookshop ${String(bookshop.city || '')}`,
      `bookshops in ${String(bookshop.city || '')}`,
      `bookshops in ${String(bookshop.city || '')}`,
      `${String(bookshop.city || '')} ${String(bookshop.state || '')} bookshops`,
      `independent bookshops ${String(bookshop.state || '')}`
    ].filter(k => k && k.trim() !== '');
    
    // Add feature-specific keywords
    if (bookshopFeatures && Array.isArray(bookshopFeatures)) {
      bookshopFeatures.forEach(feature => {
        if (feature && feature.name) {
          const featureName = String(feature.name).toLowerCase();
          keywords.push(`${String(bookshop.name || '')} ${featureName}`);
          keywords.push(`${featureName} bookshops in ${String(bookshop.city || '')}`);
        }
      });
    }
    
    return keywords;
  }, [bookshop, bookshopFeatures]);
  
  // Always use slug-based canonical URL, never numeric IDs
  const canonicalUrl = useMemo(() => {
    if (!bookshop) return "";
    // Always generate the canonical slug from the bookshop name
    // This ensures canonical URLs are consistent regardless of how the page was accessed
    const canonicalSlug = generateSlugFromName(bookshop.name);
    // Fallback to numeric ID if slug is empty (edge case: all special characters in name)
    const finalSlug = canonicalSlug || String(bookshop.id);
    return `${BASE_URL}/bookshop/${finalSlug}`;
  }, [bookshop]);
  
  // Used for ogImage, ensures we handle null values correctly
  const getImageUrl = useMemo(() => {
    return bookshop?.imageUrl || undefined;
  }, [bookshop]);

  if (isLoadingBookshop) {
    return (
      <div className="container mx-auto px-4 py-8 md:py-12 lg:py-16">
        <div className="text-center py-10">
          <p className="text-base">Loading bookshop details...</p>
        </div>
      </div>
    );
  }

  // Handle error state: Show error message but don't auto-redirect numeric IDs
  // Numeric IDs should wait for the redirect to slug (handled in useEffect above)
  // Only show error if query is done loading and there's an actual error
  if (!isLoadingBookshop && (isErrorBookshop || !bookshop)) {
    // For numeric IDs, show a more helpful error message
    // Don't auto-redirect - let the user decide
    if (isNumericId) {
      return (
        <div className="container mx-auto px-4 py-8 md:py-12 lg:py-16">
          <p className="text-lg mb-4">
            Bookshop with ID <strong>{bookshopSlug}</strong> not found.
          </p>
          <p className="mb-4 text-gray-600">
            The bookshop may have been removed or the ID is incorrect.
          </p>
          <div className="flex gap-4">
            <Button 
              className="bg-[#2A6B7C] hover:bg-[#2A6B7C]/90 text-white"
              onClick={() => setLocation('/directory')}
            >
              Browse Directory
            </Button>
            <Button 
              variant="outline"
              onClick={() => window.history.back()}
            >
              Go Back
            </Button>
          </div>
        </div>
      );
    }
    
    // For slug-based URLs, show generic error (they'll be redirected to directory by useEffect)
    return (
      <div className="container mx-auto px-4 py-8 md:py-12 lg:py-16">
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
    <div 
      className="bg-[#F7F3E8] min-h-screen" 
      style={{ 
        minHeight: '100vh',
        containIntrinsicSize: 'auto 100vh'
      }}
    >
      {/* SEO Component - only render when bookshop data is available */}
      {bookshop && (
        <SEO 
          title={seoTitle}
          description={seoDescription}
          keywords={seoKeywords}
          canonicalUrl={canonicalUrl}
          ogImage={getImageUrl}
        />
      )}
      
      <div className="relative h-64 md:h-96" style={{ minHeight: '256px' }}>
        <OptimizedImage 
          src={bookshop.imageUrl || "https://images.unsplash.com/photo-1507842217343-583bb7270b66?ixlib=rb-4.0.3&auto=format&fit=crop&w=1200&h=400"}
          alt={`${bookshop.name} - independent bookshop in ${bookshop.city}, ${bookshop.state}`} 
          className="w-full h-full" 
          width={1200}
          height={400}
          objectFit="cover"
          loading="eager"
          sizes="100vw"
          placeholderColor="#f7f3e8"
        />
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-4" style={{ minHeight: '120px' }}>
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <h1 
              className="font-serif text-2xl md:text-3xl lg:text-h1 xl:text-display font-bold text-white"
              style={{ 
                minHeight: '48px',
                lineHeight: '1.2'
              }}
            >
              {bookshop.name} | Independent Bookshop in {bookshop.city}
            </h1>
            <p 
              className="font-sans text-body-sm md:text-body text-gray-100"
              style={{ 
                minHeight: '24px',
                lineHeight: '1.5'
              }}
            >
              {bookshop.city}, {bookshop.state} • Indie Bookshop
            </p>
          </div>
        </div>
      </div>
      
      <div className="container mx-auto px-4 py-8" style={{ minHeight: '400px' }}>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="md:col-span-2">
            <div className="bg-white rounded-lg shadow-sm p-6 mb-6" style={{ minHeight: '300px' }}>
              <h2 
                className="font-serif font-bold text-2xl mb-4"
                style={{ 
                  minHeight: '32px',
                  lineHeight: '1.2'
                }}
              >
                About {bookshop.name} - Independent Bookshop in {bookshop.city}
              </h2>
              <p className="mb-4" style={{ minHeight: '60px', lineHeight: '1.6' }}>{bookshop.description}</p>
              <p className="mb-6 text-gray-700">
                {bookshop.name} is a cherished independent bookshop located in {bookshop.city}, {bookshop.state}. 
                As a local indie bookshop, we provide a curated selection of books and a unique shopping 
                experience that online retailers simply can't match.
              </p>
              
              <div className="mt-8" style={{ minHeight: bookshopFeatures.length > 0 ? 'auto' : '80px' }}>
                <h3 className="font-serif font-bold text-xl mb-4">Specialty Areas & Features</h3>
                <p className="mb-3 text-gray-700">
                  {bookshop.name} specializes in the following areas and offers these features to our community:
                </p>
                <div className="flex flex-wrap gap-2" style={{ minHeight: '40px' }}>
                  {bookshopFeatures.length > 0 ? (
                    bookshopFeatures.map(feature => (
                      <span key={feature.id} className="store-feature-tag bg-[rgba(42,107,124,0.1)] text-[#2A6B7C] rounded-full px-3 py-1 text-xs font-semibold">
                        {feature.name}
                      </span>
                    ))
                  ) : (
                    <span className="text-gray-400 text-sm">No features listed</span>
                  )}
                </div>
              </div>
              
              <div className="mt-8">
                <h3 className="font-serif font-bold text-xl mb-4">Photo Gallery</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                  {/* Use locally hosted SVG images that we created */}
                  <div className="rounded-md h-40 w-full overflow-hidden bg-gray-100" style={{ aspectRatio: '4/3' }}>
                    <img 
                      src={bookshop.imageUrl || "/images/bookshop-interior.svg"} 
                      alt={`${bookshop.name} bookshop interior`}
                      className="h-full w-full object-cover"
                      width={400}
                      height={300}
                      loading="lazy"
                      onError={(e) => {
                        e.currentTarget.src = "/images/bookshop-interior.svg";
                      }}
                    />
                  </div>
                  <div className="rounded-md h-40 w-full overflow-hidden bg-gray-100" style={{ aspectRatio: '4/3' }}>
                    <img 
                      src="/images/bookshop-display.svg" 
                      alt={`Book display at ${bookshop.name}`}
                      className="h-full w-full object-cover"
                      width={400}
                      height={300}
                      loading="lazy"
                    />
                  </div>
                  <div className="rounded-md h-40 w-full overflow-hidden bg-gray-100" style={{ aspectRatio: '4/3' }}>
                    <img 
                      src="/images/bookshop-reading.svg" 
                      alt={`Reading area at ${bookshop.name}`}
                      className="h-full w-full object-cover"
                      width={400}
                      height={300}
                      loading="lazy"
                    />
                  </div>
                  <div className="rounded-md h-40 w-full overflow-hidden bg-gray-100" style={{ aspectRatio: '4/3' }}>
                    <img 
                      src="/images/bookshop-storefront.svg" 
                      alt={`${bookshop.name} storefront`}
                      className="h-full w-full object-cover"
                      width={400}
                      height={300}
                      loading="lazy"
                    />
                  </div>
                  <div className="rounded-md h-40 w-full overflow-hidden bg-gray-100" style={{ aspectRatio: '4/3' }}>
                    <img 
                      src="/images/bookshop-cafe.svg" 
                      alt={`Café area at ${bookshop.name}`}
                      className="h-full w-full object-cover"
                      width={400}
                      height={300}
                      loading="lazy"
                    />
                  </div>
                  <div className="rounded-md h-40 w-full overflow-hidden bg-gray-100" style={{ aspectRatio: '4/3' }}>
                    <img 
                      src="/images/bookshop-event.svg" 
                      alt={`Author event at ${bookshop.name}`}
                      className="h-full w-full object-cover"
                      width={400}
                      height={300}
                      loading="lazy"
                    />
                  </div>
                </div>
              </div>
              
              <div className="mt-8" style={{ minHeight: events && events.length > 0 ? 'auto' : '1px' }}>
                {events && events.length > 0 && (
                  <>
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
                  </>
                )}
              </div>
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
              <div className="bg-gray-200 h-64 rounded-md overflow-hidden" style={{ minHeight: '256px' }}>
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
      <div className="container mx-auto px-4 pb-8" style={{ minHeight: '200px' }}>
        <RelatedBookshops currentBookshop={bookshop} />
      </div>
    </div>
  );
};

export default BookshopDetailPage;