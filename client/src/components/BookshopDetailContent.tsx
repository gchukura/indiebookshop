import React, { useState, useMemo } from 'react';

import { MapPin, Phone, Globe, Clock, ExternalLink, Star, Camera, ChevronLeft, ChevronRight } from 'lucide-react';

import { Link } from 'wouter';

import SingleLocationMap from '@/components/SingleLocationMap';

import Breadcrumbs, { BreadcrumbItem } from '@/components/Breadcrumbs';

import { generateSlugFromName } from '@/lib/linkUtils';

import { BASE_URL } from '@/lib/seo';

import { OpeningHours } from '@/components/OpeningHours';



interface Feature {

  id: number;

  name: string;

}



interface GooglePhoto {
  photo_reference: string;
}

interface GoogleReview {
  author_name: string;
  rating: number;
  text: string;
  time: number;
}

interface BookshopDetails {
  id: number;
  name: string;
  city: string;
  state: string;
  street?: string;
  zip?: string;
  description?: string;
  phone?: string;
  website?: string;
  hours?: Record<string, string>;
  imageUrl?: string;
  latitude?: number;
  longitude?: number;
  // Google Places API fields
  googlePlaceId?: string | null;
  googleRating?: string | null;
  googleReviewCount?: number | null;
  googleDescription?: string | null;
  googlePhotos?: GooglePhoto[] | null;
  googleReviews?: GoogleReview[] | null;
  googlePriceLevel?: number | null;
  googleDataUpdatedAt?: string | null;
  // NEW: Contact & business data
  formattedPhone?: string;
  websiteVerified?: string;
  openingHoursJson?: {
    open_now: boolean;
    weekday_text: string[];
    periods?: Array<{
      open: { day: number; time: string };
      close?: { day: number; time: string };
    }>;
  };
  googleMapsUrl?: string;
  googleTypes?: string[];
  formattedAddressGoogle?: string;
  businessStatus?: string;
  // AI-generated description fields
  aiGeneratedDescription?: string;
  descriptionValidated?: boolean;
  descriptionSource?: string;
  // Computed description for UI display
  displayDescription?: string;
  descriptionSourceForUI?: 'google' | 'ai' | 'template' | 'fallback';
}



interface BookshopDetailContentProps {

  bookshop: BookshopDetails;

  features?: Feature[];

}



export const BookshopDetailContent: React.FC<BookshopDetailContentProps> = ({ bookshop, features = [] }) => {

  const {
    id,
    name,
    city,
    state,
    street,
    zip,
    description,
    phone,
    website,
    hours,
    imageUrl,
    latitude,
    longitude,
    googleRating,
    googleReviewCount,
    googleDescription,
    googlePhotos,
    googleReviews,
    googlePriceLevel,
    formattedPhone,
    websiteVerified,
    openingHoursJson,
    googleMapsUrl,
    googleTypes,
    formattedAddressGoogle,
    businessStatus,
    aiGeneratedDescription,
    descriptionValidated,
    descriptionSource,
    displayDescription,
    descriptionSourceForUI,
  } = bookshop;

  // Debug: Log photos data (development only)
  React.useEffect(() => {
    if (process.env.NODE_ENV === 'development' && googlePhotos) {
      console.log('BookshopDetailContent - googlePhotos:', {
        isArray: Array.isArray(googlePhotos),
        length: googlePhotos.length,
        firstPhoto: googlePhotos[0]
      });
    }
  }, [googlePhotos]);

  // State for photo carousel
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);

  // Helper to format rating
  const formatRating = (rating: string | null | undefined): number | null => {
    if (!rating) return null;
    const num = parseFloat(rating);
    return isNaN(num) ? null : num;
  };

  // Helper to format review time
  const formatReviewTime = (unixTimestamp: number): string => {
    const date = new Date(unixTimestamp * 1000);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
    if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`;
    return `${Math.floor(diffDays / 365)} years ago`;
  };

  // Helper to get photo URL
  const getPhotoUrl = (photoReference: string, maxWidth: number = 400): string => {
    if (!photoReference) return '';
    return `/api/place-photo?photo_reference=${encodeURIComponent(photoReference)}&maxwidth=${maxWidth}`;
  };

  // Helper to extract photo reference from photo object/string
  const extractPhotoReference = (photo: GooglePhoto | string | null | undefined): string | null => {
    if (!photo) return null;
    if (typeof photo === 'string') return photo;
    if (typeof photo === 'object' && photo.photo_reference) {
      return photo.photo_reference;
    }
    return null;
  };

  // Helper to get hero photo reference (first photo)
  const getHeroPhotoReference = useMemo((): string | null => {
    if (!googlePhotos || !Array.isArray(googlePhotos) || googlePhotos.length === 0) {
      return null;
    }
    return extractPhotoReference(googlePhotos[0]);
  }, [googlePhotos]);

  // Helper to get hero image URL
  const getHeroImageUrl = useMemo((): string => {
    const heroPhotoRef = getHeroPhotoReference;
    if (heroPhotoRef) {
      return getPhotoUrl(heroPhotoRef, 1200);
    }
    // Fallback to Unsplash stock photo for indie bookshops
    return 'https://images.unsplash.com/photo-1507842217343-583bb7270b66?ixlib=rb-4.0.3&auto=format&fit=crop&w=1200&h=600';
  }, [getHeroPhotoReference]);

  // Helper to get gallery photos (excluding the hero photo)
  const getGalleryPhotos = useMemo((): GooglePhoto[] => {
    if (!googlePhotos || !Array.isArray(googlePhotos) || googlePhotos.length === 0) {
      return [];
    }
    const heroPhotoRef = getHeroPhotoReference;
    if (!heroPhotoRef) {
      return googlePhotos;
    }
    // Filter out the hero photo
    return googlePhotos.filter((photo) => {
      const photoRef = extractPhotoReference(photo);
      return photoRef !== heroPhotoRef;
    });
  }, [googlePhotos, getHeroPhotoReference]);

  // Reset carousel index when gallery photos change
  React.useEffect(() => {
    setCurrentPhotoIndex(0);
  }, [getGalleryPhotos]);

  // Helper functions for About section
  const getPrimaryDescription = (): string => {
    const original = description || '';
    const google = googleDescription || '';
    
    // Use the longer/more comprehensive one
    if (google.length > original.length) return google;
    if (original.length > 0) return original;
    
    // Fallback
    return `${name} is an independent bookshop in ${city}, ${state}.`;
  };

  const hasSecondaryDescription = (): boolean => {
    const original = description || '';
    const google = googleDescription || '';
    return original.length > 0 && google.length > 0 && original !== google;
  };

  const getSecondaryDescription = (): string => {
    const original = description || '';
    const google = googleDescription || '';
    
    // Return the shorter one (since primary is longer)
    return google.length > original.length ? original : google;
  };




  // Helper to format phone numbers

  const formatPhone = (phoneNum: string) => {

    const cleaned = phoneNum.replace(/\D/g, '');

    if (cleaned.length === 10) {

      return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;

    }

    return phoneNum;

  };



  // Helper to clean up URLs

  const formatWebsite = (url: string) => {

    try {

      return new URL(url.startsWith('http') ? url : `https://${url}`).hostname;

    } catch {

      return url.replace(/^https?:\/\//, '').replace(/\/$/, '');

    }

  };



  // Get full address

  const fullAddress = [street, `${city}, ${state} ${zip}`].filter(Boolean).join('\n');



  // Generate breadcrumb data
  const citySlug = generateSlugFromName(city);
  const stateLower = state.toLowerCase();
  const fullAddressString = [street, `${city}, ${state} ${zip}`].filter(Boolean).join(', ');

  const breadcrumbItems: BreadcrumbItem[] = useMemo(() => {
    const canonicalSlug = generateSlugFromName(name);
    const finalSlug = canonicalSlug || String(id);
    const canonicalUrl = `${BASE_URL}/bookshop/${finalSlug}`;
    
    return [
      { label: 'Home', href: '/' },
      { label: 'Directory', href: '/directory' },
      { label: state, href: `/directory/state/${state}` },
      { label: city, href: `/directory/city/${stateLower}/${citySlug}` },
      { label: name, href: canonicalUrl.replace(BASE_URL, ''), isCurrent: true }
    ];
  }, [name, city, state, stateLower, citySlug, id]);

  // Compute CTA values (prioritize Google Places verified fields)
  const websiteUrl = websiteVerified || website;
  const phoneNumber = formattedPhone || phone;
  const hasDirections = googleMapsUrl || (street || city);

  return (

    <div className="bg-[#F7F3E8] min-h-screen">

      {/* Clean Header Section with Hero Image Background */}
      <div className="relative border-b-2 border-stone-200 overflow-hidden">
        {/* Hero Image Background */}
        <div 
          className="absolute inset-0 bg-cover bg-center"
          style={{
            backgroundImage: `url(${getHeroImageUrl})`,
          }}
        >
          {/* Overlay for text readability - gradient stronger at top where text is */}
          <div className="absolute inset-0 bg-gradient-to-b from-white/75 via-white/60 to-white/35 backdrop-blur-[2px]" />
        </div>
        
        {/* Header Content */}
        <div className="relative container mx-auto max-w-7xl px-4 sm:px-6 lg:px-12 xl:px-16 py-8 md:py-12">
          {/* Breadcrumb Navigation */}
          <div className="mb-4">
            <Breadcrumbs items={breadcrumbItems} className="text-sm" />
          </div>

          {/* Title, Location, and Actions - aligned with About section content */}
          <div className="px-6 md:px-8 -mx-6 md:-mx-8">
            {/* Title and Location */}
            <div className="mb-6">
              <h1 className="font-serif text-3xl md:text-4xl lg:text-5xl xl:text-6xl font-extrabold text-[#2A1F15] mb-3 drop-shadow-[0_2px_8px_rgba(255,255,255,0.95)] drop-shadow-[0_1px_2px_rgba(0,0,0,0.1)]">
                {name}
              </h1>
              <div className="flex flex-wrap items-center gap-4 text-stone-900 font-semibold text-base md:text-lg drop-shadow-[0_1px_4px_rgba(255,255,255,0.9)] drop-shadow-[0_1px_1px_rgba(0,0,0,0.1)]">
                <div className="flex items-center gap-2">
                  <MapPin className="w-5 h-5 md:w-6 md:h-6 text-[#1A5A6B] drop-shadow-[0_1px_3px_rgba(255,255,255,0.9)]" />
                  <span>{city}, {state}</span>
                </div>
                <span className="text-stone-600">•</span>
                <span>Independent Bookshop</span>
              </div>
            </div>

            {/* Quick Action Buttons */}
            <div className="flex flex-wrap gap-3">
              {hasDirections && (
                <a 
                  href={googleMapsUrl || `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(fullAddressString)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#E16D3D] hover:bg-[#C55A2F] text-white font-medium rounded-lg transition-colors"
                >
                  <MapPin className="w-5 h-5" />
                  Get Directions
                </a>
              )}
              {websiteUrl && (
                <a 
                  href={websiteUrl.startsWith('http') ? websiteUrl : `https://${websiteUrl}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-4 py-2.5 bg-white hover:bg-stone-50 text-[#2A6B7C] border-2 border-[#2A6B7C] font-medium rounded-lg transition-colors"
                >
                  <Globe className="w-5 h-5" />
                  Visit Website
                </a>
              )}
              {phoneNumber && (
                <a 
                  href={`tel:${phoneNumber}`}
                  className="inline-flex items-center gap-2 px-4 py-2.5 bg-white hover:bg-stone-50 text-[#2A6B7C] border-2 border-stone-300 font-medium rounded-lg transition-colors"
                >
                  <Phone className="w-5 h-5" />
                  Call Now
                </a>
              )}
            </div>
          </div>
        </div>
      </div>



      {/* Main Content */}

      <div className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-12 xl:px-16 py-8 md:py-12">

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8">

          

          {/* Left Column - Main Content */}

          <div className="lg:col-span-8 space-y-6">

            {/* About Section - Priority-based description */}
            {displayDescription ? (
              <div className="bg-white rounded-lg shadow-sm border border-stone-200 p-6 md:p-8">
                <h2 className="font-serif text-xl md:text-2xl font-bold text-[#5F4B32] mb-4">
                  About {name}
                </h2>
                <p className="text-stone-700 leading-relaxed text-base md:text-lg">
                  {displayDescription}
                </p>
              </div>
            ) : (
              // Fallback: Always show something, even if sparse
              <div className="bg-white rounded-lg shadow-sm border border-stone-200 p-6 md:p-8">
                <h2 className="font-serif text-xl md:text-2xl font-bold text-[#5F4B32] mb-4">
                  About {name}
                </h2>
                <p className="text-stone-700 leading-relaxed text-base md:text-lg">
                  {name} is an independent bookstore in {city}, {state}.
                </p>
              </div>
            )}

            {/* Google Photos Gallery */}
            {getGalleryPhotos && getGalleryPhotos.length > 0 && (
              <section className="bg-white rounded-lg shadow-sm border border-stone-200 p-6 md:p-8">
                <h3 className="font-serif text-xl md:text-2xl text-[#5F4B32] font-bold mb-4">Photos</h3>
                
                {/* Mobile Carousel (< 768px) */}
                <div className="md:hidden relative mb-4">
                  <div className="relative aspect-[4/3] rounded-lg overflow-hidden bg-stone-200">
                    <img 
                      src={(() => {
                        const photo = getGalleryPhotos[currentPhotoIndex];
                        // Extract photo reference - handle both object and string formats
                        const photoRef = extractPhotoReference(photo);
                        if (!photoRef) {
                          console.warn('Invalid photo object in carousel, missing photo_reference', photo);
                          return '';
                        }
                        return getPhotoUrl(photoRef, 800);
                      })()}
                      alt={`${name} - Photo ${currentPhotoIndex + 1}`}
                      className="w-full h-full object-cover"
                      loading="lazy"
                      onError={(e) => {
                        // Silently handle image load errors - fallback image will display
                        e.currentTarget.src = "https://images.unsplash.com/photo-1507842217343-583bb7270b66?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&h=600";
                      }}
                    />
                    
                    {/* Navigation Buttons */}
                    {getGalleryPhotos.length > 1 && (
                      <>
                        <button 
                          onClick={() => setCurrentPhotoIndex(prev => prev === 0 ? getGalleryPhotos.length - 1 : prev - 1)}
                          className="absolute left-2 top-1/2 -translate-y-1/2 bg-white/90 hover:bg-white rounded-full p-2 shadow-lg"
                          aria-label="Previous photo"
                        >
                          <ChevronLeft className="w-5 h-5 text-[#5F4B32]" />
                        </button>
                        <button 
                          onClick={() => setCurrentPhotoIndex(prev => prev === getGalleryPhotos.length - 1 ? 0 : prev + 1)}
                          className="absolute right-2 top-1/2 -translate-y-1/2 bg-white/90 hover:bg-white rounded-full p-2 shadow-lg"
                          aria-label="Next photo"
                        >
                          <ChevronRight className="w-5 h-5 text-[#5F4B32]" />
                        </button>
                        
                        {/* Counter */}
                        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 bg-black/60 text-white text-xs px-3 py-1 rounded-full">
                          {currentPhotoIndex + 1} / {getGalleryPhotos.length}
                        </div>
                      </>
                    )}
                  </div>
                </div>
                
                {/* Desktop Grid (>= 768px) */}
                <div className="hidden md:grid grid-cols-2 lg:grid-cols-3 gap-4">
                  {getGalleryPhotos.map((photo, index) => {
                    // Extract photo reference - handle both object and string formats
                    const photoRef = extractPhotoReference(photo);
                    
                    if (!photoRef || photoRef.length < 10) {
                      // Skip invalid photo entries
                      console.warn('Invalid photo reference at index', index, { photoRef, type: typeof photoRef, length: photoRef?.length });
                      return null;
                    }
                    
                    return (
                      <div 
                        key={index}
                        className="relative aspect-[4/3] rounded-lg overflow-hidden bg-stone-200 group cursor-pointer"
                      >
                        <img 
                          src={getPhotoUrl(photoRef, 400)}
                          alt={`${name} - Photo ${index + 1}`}
                          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                          loading="lazy"
                          onError={(e) => {
                            // Silently handle image load errors - fallback image will display
                            e.currentTarget.src = "https://images.unsplash.com/photo-1507842217343-583bb7270b66?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&h=300";
                          }}
                        />
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors"></div>
                      </div>
                    );
                  })}
                </div>
              </section>
            )}

            {/* Customer Reviews Section */}
            {googleReviews && googleReviews.length > 0 && (
              <section className="bg-white rounded-lg shadow-sm border border-stone-200 p-6 md:p-8">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="font-serif text-xl md:text-2xl text-[#5F4B32] font-bold">Customer Reviews</h3>
                  {googleRating && googleReviewCount && (
                    <div className="flex items-center gap-2 text-sm">
                      <Star className="w-4 h-4 text-[#E16D3D] fill-current" />
                      <span className="font-semibold text-[#5F4B32]">{formatRating(googleRating)?.toFixed(1)}</span>
                      <span className="text-stone-500">({googleReviewCount.toLocaleString()})</span>
                    </div>
                  )}
                </div>
                
                <div className="space-y-6">
                  {googleReviews.slice(0, 3).map((review, index) => (
                    <div key={index} className={index < Math.min(googleReviews.length, 3) - 1 ? "border-b border-stone-200 pb-6" : ""}>
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <p className="font-semibold text-[#5F4B32]">{review.author_name}</p>
                          <p className="text-xs text-stone-500">{formatReviewTime(review.time)}</p>
                        </div>
                        <div className="flex items-center gap-1">
                          {[...Array(5)].map((_, i) => (
                            <Star 
                              key={i}
                              className={`w-4 h-4 ${i < review.rating ? 'text-[#E16D3D] fill-current' : 'text-stone-300'}`}
                            />
                          ))}
                        </div>
                      </div>
                      <p className="text-stone-700 leading-relaxed">{review.text}</p>
                    </div>
                  ))}
                </div>
                
                {bookshop.googlePlaceId && (
                  <div className="mt-6 pt-6 border-t border-stone-200 text-center">
                    <a 
                      href={`https://www.google.com/maps/place/?q=place_id:${bookshop.googlePlaceId}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 text-sm font-medium text-[#2A6B7C] hover:text-[#E16D3D] transition-colors"
                    >
                      Read all reviews on Google
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  </div>
                )}
              </section>
            )}




          </div>



          {/* Right Column - Store Information Sidebar */}

          {/* Right Column - Sidebar */}
          <div className="lg:col-span-4">

            <div 

              className="bg-white rounded-lg shadow-sm border border-stone-200 p-6 mb-6"

              style={{ minHeight: '400px' }}

            >

              <h2 className="font-serif text-xl md:text-2xl text-[#5F4B32] font-bold mb-6">
                Store Information
              </h2>

              {/* Business Status Warning (if closed) */}
              {businessStatus === 'CLOSED_PERMANENTLY' && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
                  <div className="flex items-start gap-3">
                    <svg className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                    <div>
                      <p className="font-semibold text-red-900">Permanently Closed</p>
                      <p className="text-sm text-red-700 mt-1">
                        This bookshop is no longer in operation.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {businessStatus === 'CLOSED_TEMPORARILY' && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
                  <div className="flex items-start gap-3">
                    <svg className="w-5 h-5 text-yellow-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <div>
                      <p className="font-semibold text-yellow-900">Temporarily Closed</p>
                      <p className="text-sm text-yellow-700 mt-1">
                        Please check their website or call for updated hours.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              <div className="space-y-6">

                {/* Address */}

                {(formattedAddressGoogle || street || city) && (

                  <div className="flex gap-3">

                    <MapPin className="w-5 h-5 text-[#2A6B7C] flex-shrink-0 mt-0.5" aria-hidden="true" />

                    <div className="text-sm">

                      <p className="font-bold text-stone-900 mb-1.5">Address</p>

                      <p className="text-stone-700 leading-relaxed whitespace-pre-line">

                        {formattedAddressGoogle || fullAddress}

                      </p>

                    </div>

                  </div>

                )}



                {/* Phone */}

                {phone && (

                  <div className="flex gap-3">

                    <Phone className="w-5 h-5 text-[#2A6B7C] flex-shrink-0 mt-0.5" aria-hidden="true" />

                    <div className="text-sm">

                      <p className="font-bold text-stone-900 mb-1.5">Phone</p>

                      <a

                        href={`tel:${phone}`}

                        className="text-[#E16D3D] hover:text-[#C55A2F] hover:underline transition-colors"

                      >

                        {formatPhone(phone)}

                      </a>

                    </div>

                  </div>

                )}



                {/* Website */}

                {website && (

                  <div className="flex gap-3">

                    <Globe className="w-5 h-5 text-[#2A6B7C] flex-shrink-0 mt-0.5" aria-hidden="true" />

                    <div className="text-sm min-w-0">

                      <p className="font-bold text-stone-900 mb-1.5">Website</p>

                      <a

                        href={website.startsWith('http') ? website : `https://${website}`}

                        target="_blank"

                        rel="noopener noreferrer"

                        className="text-[#E16D3D] hover:text-[#C55A2F] hover:underline inline-flex items-center gap-1 break-all transition-colors"

                      >

                        {formatWebsite(website)}

                        <ExternalLink className="w-3 h-3 flex-shrink-0" aria-hidden="true" />

                      </a>

                    </div>

                  </div>

                )}



                {/* Hours - Use Google Places hours if available, otherwise fallback to manual hours */}
                {openingHoursJson && businessStatus === 'OPERATIONAL' ? (
                  <div>
                    <p className="font-bold text-stone-900 mb-3 text-sm">Hours</p>
                    <OpeningHours openingHours={openingHoursJson} />
                  </div>
                ) : (
                  <div className="flex gap-3">
                    <Clock className="w-5 h-5 text-[#2A6B7C] flex-shrink-0 mt-0.5" aria-hidden="true" />
                    <div className="text-sm flex-1">
                      <p className="font-bold text-stone-900 mb-1.5">Hours</p>
                      {hours && Object.keys(hours).length > 0 ? (
                        <div className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-stone-700">
                          {Object.entries(hours).map(([day, time]) => (
                            <React.Fragment key={day}>
                              <p className="font-medium">{day}:</p>
                              <p>{time}</p>
                            </React.Fragment>
                          ))}
                        </div>
                      ) : phone ? (
                        <p className="text-stone-500 italic">Call for hours</p>
                      ) : (
                        <p className="text-stone-500 italic">Hours not available</p>
                      )}
                    </div>
                  </div>
                )}

              </div>

            </div>

            {/* Features Section - Moved to sidebar */}
            <section className="bg-white rounded-lg shadow-sm border border-stone-200 p-6 mb-6">
              <h2 className="font-serif text-xl md:text-2xl text-[#5F4B32] font-bold mb-4">
                Specialty Areas & Features
              </h2>

              {features && features.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {features.map((feature) => (
                    <span
                      key={feature.id}
                      className="inline-flex items-center px-3 py-1.5 rounded-full bg-[#2A6B7C]/10 text-[#2A6B7C] text-sm font-semibold hover:bg-[#2A6B7C]/15 transition-all"
                    >
                      {feature.name}
                    </span>
                  ))}
                </div>
              ) : (
                <div className="bg-amber-50 rounded-lg border border-amber-200 p-6 text-center">
                  <p className="text-amber-900 font-medium mb-2">
                    Help us complete this listing!
                  </p>
                  <p className="text-sm text-amber-800">
                    We're still gathering information about {name}'s specialty areas and features.
                  </p>
                </div>
              )}

              {/* Google Types (additional context) */}
              {googleTypes && googleTypes.length > 0 && (
                <div className="mt-4 text-xs text-stone-500">
                  Google categories: {googleTypes
                    .filter(type => type !== 'point_of_interest' && type !== 'establishment')
                    .map(type => type.replace(/_/g, ' '))
                    .join(', ')}
                </div>
              )}
            </section>

            {/* Price Level Indicator */}
            {googlePriceLevel !== undefined && googlePriceLevel !== null && (
              <section className="bg-white rounded-lg shadow-sm border border-stone-200 p-6 mb-6">
                <h3 className="font-serif font-semibold text-sm text-[#5F4B32] mb-2">
                  Price Range
                </h3>
                <div className="flex items-center gap-1">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <span
                      key={i}
                      className={`text-lg ${
                        i < (googlePriceLevel || 0) 
                          ? 'text-[#5F4B32]' 
                          : 'text-stone-300'
                      }`}
                    >
                      $
                    </span>
                  ))}
                  <span className="text-xs text-stone-500 ml-2">
                    {googlePriceLevel === 0 && 'Free'}
                    {googlePriceLevel === 1 && 'Inexpensive'}
                    {googlePriceLevel === 2 && 'Moderate'}
                    {googlePriceLevel === 3 && 'Expensive'}
                    {googlePriceLevel === 4 && 'Very Expensive'}
                  </span>
                </div>
              </section>
            )}

            {/* Map Section */}

            {(latitude && longitude) && (

              <div className="bg-white rounded-lg shadow-sm border border-stone-200 p-6 mt-6">

                <h3 className="font-serif text-xl text-[#5F4B32] font-bold mb-4">Store Location</h3>

                <div 

                  className="bg-stone-200 rounded-md overflow-hidden"

                  style={{ height: '256px', minHeight: '256px' }}

                >

                  <SingleLocationMap 

                    latitude={latitude !== undefined ? String(latitude) : undefined} 

                    longitude={longitude !== undefined ? String(longitude) : undefined} 

                  />

                </div>

              </div>

            )}

          </div>

        </div>

      </div>

    </div>

  );

};



export default BookshopDetailContent;

