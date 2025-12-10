import React, { useEffect, useMemo } from 'react';

import { useParams, useLocation } from 'wouter';

import { useQuery } from '@tanstack/react-query';

import { Bookstore as Bookshop, Feature, Event } from '@shared/schema';

import { Button } from '@/components/ui/button';

import { BookshopDetailContent } from '@/components/BookshopDetailContent';

import RelatedBookshops from '@/components/RelatedBookshops';

import EmailSignupSection from '@/components/EmailSignupSection';

import Breadcrumbs, { BreadcrumbItem } from '@/components/Breadcrumbs';

import { Link } from 'wouter';

import { SEO } from '../components/SEO';

import SchemaOrg from '../components/SchemaOrg';

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

  

  const bookshopSlug = idslug || '';

  const isNumericId = /^\d+$/.test(bookshopSlug);

  

  const apiEndpoint = isNumericId 

    ? `/api/bookstores/${bookshopSlug}` 

    : `/api/bookstores/by-slug/${bookshopSlug}`;



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

    staleTime: 10 * 60 * 1000,

    throwOnError: false,

  });

  

  useEffect(() => {

    if (isSuccessBookshop && bookshop && isNumericId && !isLoadingBookshop && !isErrorBookshop) {

      logger.debug('[BookshopDetailPage] Numeric ID detected, redirecting to slug', {

        numericId: bookshopSlug,

        bookshopName: bookshop.name,

        bookshopId: bookshop.id

      });

      

      const canonicalSlug = generateSlugFromName(bookshop.name);

      const finalSlug = canonicalSlug || String(bookshop.id);

      const canonicalUrl = `/bookshop/${finalSlug}`;

      

      if (bookshopSlug !== finalSlug) {

        logger.debug('[BookshopDetailPage] Redirecting numeric ID to slug', {

          from: `/bookshop/${bookshopSlug}`,

          to: canonicalUrl

        });

        setLocation(canonicalUrl, { replace: true });

        return;

      }

    }

  }, [bookshop, isNumericId, bookshopSlug, setLocation, isLoadingBookshop, isSuccessBookshop, isErrorBookshop]);

  

  useEffect(() => {

    if (isErrorBookshop && !isNumericId && bookshopSlug && !isLoadingBookshop) {

      logger.debug('[BookshopDetailPage] Slug-based URL failed, redirecting to directory', {

        slug: bookshopSlug,

        error: bookshopError

      });

      setLocation('/directory');

    }

  }, [isErrorBookshop, bookshopSlug, isNumericId, setLocation, isLoadingBookshop, bookshopError]);



  const { data: features } = useQuery<Feature[]>({

    queryKey: ["/api/features"],

  });



  const { data: events } = useQuery<Event[]>({

    queryKey: [`/api/bookstores/${bookshop?.id}/events`],

    enabled: !!bookshop?.id,

  });



  const bookshopFeatures = features?.filter(feature => 

    bookshop?.featureIds?.includes(feature.id) || false

  ) || [];

  

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

    

    const keywords: string[] = [

      String(bookshop.name || ''),

      `${String(bookshop.name || '')} bookshop`,

      `independent bookshop ${String(bookshop.city || '')}`,

      `indie bookshop ${String(bookshop.city || '')}`,

      `bookshops in ${String(bookshop.city || '')}`,

      `${String(bookshop.city || '')} ${String(bookshop.state || '')} bookshops`,

      `independent bookshops ${String(bookshop.state || '')}`

    ].filter(k => k && k.trim() !== '');

    

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

  

  const canonicalUrl = useMemo(() => {

    if (!bookshop) return "";

    const canonicalSlug = generateSlugFromName(bookshop.name);

    const finalSlug = canonicalSlug || String(bookshop.id);

    return `${BASE_URL}/bookshop/${finalSlug}`;

  }, [bookshop]);

  

  const getImageUrl = useMemo(() => {

    return bookshop?.imageUrl || undefined;

  }, [bookshop]);

  // Generate breadcrumb items - MUST be before early returns to follow Rules of Hooks
  const breadcrumbItems: BreadcrumbItem[] = useMemo(() => {
    if (!bookshop || !bookshop.city || !bookshop.state) return [];
    
    const citySlug = generateSlugFromName(bookshop.city);
    const stateLower = bookshop.state.toLowerCase();
    
    return [
      { label: 'Home', href: '/' },
      { label: 'Directory', href: '/directory' },
      { label: bookshop.state, href: `/directory/state/${bookshop.state}` },
      { label: bookshop.city, href: `/directory/city/${stateLower}/${citySlug}` },
      { label: bookshop.name, href: canonicalUrl.replace(BASE_URL, ''), isCurrent: true }
    ];
  }, [bookshop, canonicalUrl]);

  if (isLoadingBookshop) {

    return (

      <div className="bg-[#F7F3E8] min-h-screen">

        {/* Loading Skeleton */}

        <div className="relative w-full h-64 md:h-96 bg-stone-200 animate-pulse" />

        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12">

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">

            <div className="lg:col-span-2 space-y-6">

              <div className="bg-white rounded-lg shadow-sm border border-stone-200 p-6 md:p-8">

                <div className="h-8 bg-stone-200 rounded w-1/3 mb-4 animate-pulse" />

                <div className="space-y-3">

                  <div className="h-4 bg-stone-200 rounded animate-pulse" />

                  <div className="h-4 bg-stone-200 rounded animate-pulse" />

                  <div className="h-4 bg-stone-200 rounded w-5/6 animate-pulse" />

                </div>

              </div>

            </div>

            <div className="lg:col-span-1">

              <div className="bg-white rounded-lg shadow-sm border border-stone-200 p-6">

                <div className="h-6 bg-stone-200 rounded w-2/3 mb-6 animate-pulse" />

                <div className="space-y-5">

                  <div className="h-20 bg-stone-200 rounded animate-pulse" />

                  <div className="h-16 bg-stone-200 rounded animate-pulse" />

                </div>

              </div>

            </div>

          </div>

        </div>

      </div>

    );

  }



  if (!isLoadingBookshop && (isErrorBookshop || !bookshop)) {

    if (isNumericId) {

      return (

        <div className="bg-[#F7F3E8] min-h-screen">

          <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12 lg:py-16">

            <div className="bg-white rounded-lg shadow-sm border border-stone-200 p-8 max-w-2xl mx-auto text-center">

              <h1 className="font-serif text-3xl text-[#5F4B32] font-bold mb-4">

                Bookshop Not Found

              </h1>

              <p className="text-lg mb-2 text-stone-700">

                Bookshop with ID <strong>{bookshopSlug}</strong> not found.

              </p>

              <p className="mb-6 text-stone-600">

                The bookshop may have been removed or the ID is incorrect.

              </p>

              <div className="flex gap-4 justify-center">

                <Button 

                  className="bg-[#E16D3D] hover:bg-[#C55A2F] text-white"

                  onClick={() => setLocation('/directory')}

                >

                  Browse Directory

                </Button>

                <Button 

                  variant="outline"

                  className="border-[#2A6B7C] text-[#2A6B7C] hover:bg-[#2A6B7C] hover:text-white"

                  onClick={() => window.history.back()}

                >

                  Go Back

                </Button>

              </div>

            </div>

          </div>

        </div>

      );

    }

    

    return (

      <div className="bg-[#F7F3E8] min-h-screen">

        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12 lg:py-16">

          <div className="bg-white rounded-lg shadow-sm border border-stone-200 p-8 max-w-2xl mx-auto text-center">

            <h1 className="font-serif text-3xl text-[#5F4B32] font-bold mb-4">

              Bookshop Not Found

            </h1>

            <p className="mb-6 text-stone-600">

              Error loading bookshop. The bookshop may not exist or there was a problem with the connection.

            </p>

            <Button 

              className="bg-[#E16D3D] hover:bg-[#C55A2F] text-white"

              onClick={() => setLocation('/directory')}

            >

              Return to Directory

            </Button>

          </div>

        </div>

      </div>

    );

  }



  // Type guard: ensure bookshop is defined
  if (!bookshop) {
    return (
      <div className="bg-[#F7F3E8] min-h-screen">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12 lg:py-16">
          <div className="bg-white rounded-lg shadow-sm border border-stone-200 p-8 max-w-2xl mx-auto text-center">
            <h1 className="font-serif text-3xl text-[#5F4B32] font-bold mb-4">
              Bookshop Not Found
            </h1>
            <p className="mb-6 text-stone-600">
              Error loading bookshop. The bookshop may not exist or there was a problem with the connection.
            </p>
            <Button 
              className="bg-[#E16D3D] hover:bg-[#C55A2F] text-white"
              onClick={() => setLocation('/directory')}
            >
              Return to Directory
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Transform bookshop data to match BookshopDetails interface (convert null to undefined)
  // Note: latitude and longitude may be null/undefined, which is handled by BookshopDetailContent
  const bookshopDetails = {
    id: bookshop.id,
    name: bookshop.name,
    city: bookshop.city,
    state: bookshop.state,
    street: bookshop.street || undefined,
    zip: bookshop.zip || undefined,
    description: bookshop.description || undefined,
    phone: bookshop.phone || undefined,
    website: bookshop.website || undefined,
    hours: bookshop.hours || undefined,
    imageUrl: bookshop.imageUrl || undefined,
    latitude: (typeof bookshop.latitude === 'number' ? bookshop.latitude : undefined),
    longitude: (typeof bookshop.longitude === 'number' ? bookshop.longitude : undefined),
    // Google Places API fields
    googlePlaceId: bookshop.googlePlaceId || undefined,
    googleRating: bookshop.googleRating || undefined,
    googleReviewCount: bookshop.googleReviewCount || undefined,
    googleDescription: bookshop.googleDescription || undefined,
    googlePhotos: (() => {
      const photos = bookshop.googlePhotos;
      if (!photos) {
        logger.debug('[BookshopDetailPage] No googlePhotos in bookshop data');
        return undefined;
      }
      if (!Array.isArray(photos)) {
        logger.warn('[BookshopDetailPage] googlePhotos is not an array', { type: typeof photos, value: photos });
        return undefined;
      }
      if (photos.length === 0) {
        logger.debug('[BookshopDetailPage] googlePhotos array is empty');
        return undefined;
      }
      logger.debug('[BookshopDetailPage] googlePhotos found', { count: photos.length, firstPhoto: photos[0] });
      return photos;
    })(),
    googleReviews: (bookshop.googleReviews && Array.isArray(bookshop.googleReviews) && bookshop.googleReviews.length > 0) ? bookshop.googleReviews : undefined,
    googlePriceLevel: bookshop.googlePriceLevel || undefined,
    googleDataUpdatedAt: bookshop.googleDataUpdatedAt || undefined,
  };

  return (

    <>

      {/* SEO Component */}

      <SEO 

        title={seoTitle}

        description={seoDescription}

        keywords={seoKeywords}

        canonicalUrl={canonicalUrl}

        ogImage={getImageUrl}

      />

      {/* Main Bookshop Detail Content */}

      <BookshopDetailContent 

        bookshop={bookshopDetails}

        features={bookshopFeatures}

      />

      

      {/* Photo Gallery Section - Full Width */}
      {/* COMMENTED OUT: Photo gallery until we have actual photos */}
      {false && (
      <div className="bg-[#F7F3E8]">

        <div className="container mx-auto px-4 sm:px-6 lg:px-8 pb-8">

          <div className="bg-white rounded-lg shadow-sm border border-stone-200 p-6 md:p-8">

            <h3 className="font-serif font-bold text-2xl md:text-3xl text-[#5F4B32] mb-6">

              Photo Gallery

            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">

              <div className="rounded-md h-40 w-full overflow-hidden bg-stone-100" style={{ aspectRatio: '4/3' }}>

                <img 

                  src={bookshop?.imageUrl || "/images/bookshop-interior.svg"} 

                  alt={`${bookshop?.name || 'Bookshop'} bookshop interior`}

                  className="h-full w-full object-cover hover:scale-105 transition-transform duration-300"

                  width={400}

                  height={300}

                  loading="lazy"

                  onError={(e) => {

                    e.currentTarget.src = "/images/bookshop-interior.svg";

                  }}

                />

              </div>

              <div className="rounded-md h-40 w-full overflow-hidden bg-stone-100" style={{ aspectRatio: '4/3' }}>

                <img 

                  src="/images/bookshop-display.svg" 

                  alt={`Book display at ${bookshop?.name || 'bookshop'}`}

                  className="h-full w-full object-cover hover:scale-105 transition-transform duration-300"

                  width={400}

                  height={300}

                  loading="lazy"

                />

              </div>

              <div className="rounded-md h-40 w-full overflow-hidden bg-stone-100" style={{ aspectRatio: '4/3' }}>

                <img 

                  src="/images/bookshop-reading.svg" 

                  alt={`Reading area at ${bookshop?.name || 'bookshop'}`}

                  className="h-full w-full object-cover hover:scale-105 transition-transform duration-300"

                  width={400}

                  height={300}

                  loading="lazy"

                />

              </div>

              <div className="rounded-md h-40 w-full overflow-hidden bg-stone-100" style={{ aspectRatio: '4/3' }}>

                <img 

                  src="/images/bookshop-storefront.svg" 

                  alt={`${bookshop?.name || 'Bookshop'} storefront`}

                  className="h-full w-full object-cover hover:scale-105 transition-transform duration-300"

                  width={400}

                  height={300}

                  loading="lazy"

                />

              </div>

              <div className="rounded-md h-40 w-full overflow-hidden bg-stone-100" style={{ aspectRatio: '4/3' }}>

                <img 

                  src="/images/bookshop-cafe.svg" 

                  alt={`Café area at ${bookshop?.name || 'bookshop'}`}

                  className="h-full w-full object-cover hover:scale-105 transition-transform duration-300"

                  width={400}

                  height={300}

                  loading="lazy"

                />

              </div>

              <div className="rounded-md h-40 w-full overflow-hidden bg-stone-100" style={{ aspectRatio: '4/3' }}>

                <img 

                  src="/images/bookshop-event.svg" 

                  alt={`Author event at ${bookshop?.name || 'bookshop'}`}

                  className="h-full w-full object-cover hover:scale-105 transition-transform duration-300"

                  width={400}

                  height={300}

                  loading="lazy"

                />

              </div>

            </div>

          </div>

        </div>

      </div>
      )}

      

      {/* Events Section - Full Width */}

      {events && events.length > 0 && (

        <div className="bg-[#F7F3E8]">

          <div className="container mx-auto px-4 sm:px-6 lg:px-8 pb-8">

            <div className="bg-white rounded-lg shadow-sm border border-stone-200 p-6 md:p-8">

              <h3 className="font-serif font-bold text-2xl md:text-3xl text-[#5F4B32] mb-6">

                Upcoming Events

              </h3>

              <div className="space-y-4">

                {events.map(event => (

                  <div key={event.id} className="border-l-4 border-[#E16D3D] pl-4 py-2 hover:bg-stone-50 transition-colors">

                    <p className="font-bold text-[#5F4B32]">{event.title}</p>

                    <p className="text-sm text-stone-600 mt-1">{event.date} • {event.time}</p>

                    <p className="text-sm mt-2 text-stone-700">{event.description}</p>

                  </div>

                ))}

              </div>

            </div>

          </div>

        </div>

      )}

      

      {/* Related Bookshops Section - Full Width */}

      <div className="bg-[#F7F3E8]">

        <div className="container mx-auto px-4 sm:px-6 lg:px-8 pb-8">

          <RelatedBookshops currentBookshop={bookshop} />

        </div>

      </div>

      {/* Email Signup Section */}
      <EmailSignupSection />

      

      {/* Navigation Links Section - Full Width */}
      {/* COMMENTED OUT: Explore More Independent Bookshops module - uncomment when ready */}
      {false && (
      <div className="bg-white border-t border-gray-200">

        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12">

          <div className="max-w-4xl mx-auto">

            <div className="bg-[#F7F3E8] rounded-lg shadow-sm border border-stone-200 p-6 md:p-8">

              <h2 className="font-serif text-2xl md:text-3xl font-bold text-[#5F4B32] mb-6 text-center">

                Explore More Independent Bookshops

              </h2>

              

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">

                <Link

                  to="/directory"

                  className="block bg-white hover:bg-stone-50 border-2 border-stone-200 hover:border-[#2A6B7C] rounded-lg p-4 transition-all group"

                >

                  <div className="flex items-center gap-3">

                    <div className="flex-shrink-0 w-10 h-10 bg-[#2A6B7C] rounded-full flex items-center justify-center group-hover:bg-[#E16D3D] transition-colors">

                      <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">

                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />

                      </svg>

                    </div>

                    <div>

                      <h3 className="font-serif font-bold text-lg text-[#5F4B32] group-hover:text-[#2A6B7C] transition-colors">

                        Browse Directory

                      </h3>

                      <p className="font-sans text-sm text-gray-600">

                        Discover 2,000+ independent bookshops

                      </p>

                    </div>

                  </div>

                </Link>

                

                <Link

                  to={`/directory/state/${bookshop?.state || ''}`}

                  className="block bg-white hover:bg-stone-50 border-2 border-stone-200 hover:border-[#2A6B7C] rounded-lg p-4 transition-all group"

                >

                  <div className="flex items-center gap-3">

                    <div className="flex-shrink-0 w-10 h-10 bg-[#2A6B7C] rounded-full flex items-center justify-center group-hover:bg-[#E16D3D] transition-colors">

                      <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">

                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />

                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />

                      </svg>

                    </div>

                    <div>

                      <h3 className="font-serif font-bold text-lg text-[#5F4B32] group-hover:text-[#2A6B7C] transition-colors">

                        More in {bookshop?.state || ''}

                      </h3>

                      <p className="font-sans text-sm text-gray-600">

                        Find bookshops in {bookshop?.state || ''}

                      </p>

                    </div>

                  </div>

                </Link>

                

                <Link

                  to={`/directory/city/${bookshop?.state?.toLowerCase() || ''}/${generateSlugFromName(bookshop?.city || '')}`}

                  className="block bg-white hover:bg-stone-50 border-2 border-stone-200 hover:border-[#2A6B7C] rounded-lg p-4 transition-all group"

                >

                  <div className="flex items-center gap-3">

                    <div className="flex-shrink-0 w-10 h-10 bg-[#2A6B7C] rounded-full flex items-center justify-center group-hover:bg-[#E16D3D] transition-colors">

                      <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">

                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />

                      </svg>

                    </div>

                    <div>

                      <h3 className="font-serif font-bold text-lg text-[#5F4B32] group-hover:text-[#2A6B7C] transition-colors">

                        Bookshops in {bookshop?.city || ''}

                      </h3>

                      <p className="font-sans text-sm text-gray-600">

                        Explore indie bookshops in {bookshop?.city || ''}, {bookshop?.state || ''}

                      </p>

                    </div>

                  </div>

                </Link>

                

                <Link

                  to="/events"

                  className="block bg-white hover:bg-stone-50 border-2 border-stone-200 hover:border-[#2A6B7C] rounded-lg p-4 transition-all group"

                >

                  <div className="flex items-center gap-3">

                    <div className="flex-shrink-0 w-10 h-10 bg-[#2A6B7C] rounded-full flex items-center justify-center group-hover:bg-[#E16D3D] transition-colors">

                      <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">

                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />

                      </svg>

                    </div>

                    <div>

                      <h3 className="font-serif font-bold text-lg text-[#5F4B32] group-hover:text-[#2A6B7C] transition-colors">

                        Bookshop Events

                      </h3>

                      <p className="font-sans text-sm text-gray-600">

                        Find author signings and literary events

                      </p>

                    </div>

                  </div>

                </Link>

              </div>

              

              {/* Additional Internal Links */}

              <div className="pt-6 border-t border-stone-200">

                <div className="flex flex-wrap justify-center gap-4 md:gap-6 text-sm">

                  <Link

                    to="/about"

                    className="text-[#2A6B7C] hover:text-[#E16D3D] hover:underline font-medium transition-colors"

                  >

                    About Us

                  </Link>

                  <Link

                    to="/contact"

                    className="text-[#2A6B7C] hover:text-[#E16D3D] hover:underline font-medium transition-colors"

                  >

                    Contact

                  </Link>

                  <Link

                    to="/blog"

                    className="text-[#2A6B7C] hover:text-[#E16D3D] hover:underline font-medium transition-colors"

                  >

                    Blog

                  </Link>

                  <Link

                    to="/submit-bookshop"

                    className="text-[#2A6B7C] hover:text-[#E16D3D] hover:underline font-medium transition-colors"

                  >

                    Submit a Bookshop

                  </Link>

                </div>

              </div>

            </div>

          </div>

        </div>

      </div>
      )}

    </>

  );

};



export default BookshopDetailPage;
