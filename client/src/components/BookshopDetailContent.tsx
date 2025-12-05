import React, { useState, useMemo } from 'react';

import { MapPin, Phone, Globe, Clock, ExternalLink, Star, Camera, ChevronLeft, ChevronRight } from 'lucide-react';

import { Link } from 'wouter';

import SingleLocationMap from '@/components/SingleLocationMap';

import Breadcrumbs, { BreadcrumbItem } from '@/components/Breadcrumbs';

import { generateSlugFromName } from '@/lib/linkUtils';

import { BASE_URL } from '@/lib/seo';



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
}



interface BookshopDetailContentProps {

  bookshop: BookshopDetails;

  features?: Feature[];

}



export const BookshopDetailContent: React.FC<BookshopDetailContentProps> = ({ bookshop, features = [] }) => {

  const {
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
  } = bookshop;

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
    return `/api/place-photo?photo_reference=${encodeURIComponent(photoReference)}&maxwidth=${maxWidth}`;
  };

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

  return (

    <div className="bg-[#F7F3E8] min-h-screen">

      {/* Clean Header Section */}
      <div className="bg-white border-b-2 border-stone-200">
        <div className="container mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 md:py-12">
          {/* Breadcrumb Navigation */}
          <div className="mb-4">
            <Breadcrumbs items={breadcrumbItems} className="text-sm" />
          </div>

          {/* Title and Location */}
          <div className="mb-6">
            <h1 className="font-serif text-3xl md:text-4xl lg:text-5xl font-bold text-[#5F4B32] mb-3">
              {name}
            </h1>
            <div className="flex flex-wrap items-center gap-4 text-stone-600">
              <div className="flex items-center gap-2">
                <MapPin className="w-5 h-5 text-[#2A6B7C]" />
                <span className="text-base md:text-lg">{city}, {state}</span>
              </div>
              <span className="text-stone-400">•</span>
              <span className="text-base md:text-lg">Independent Bookshop</span>
            </div>
          </div>

          {/* Quick Action Buttons */}
          <div className="flex flex-wrap gap-3">
            {(street || city) && (
              <a 
                href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(fullAddressString)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#E16D3D] hover:bg-[#C55A2F] text-white font-medium rounded-lg transition-colors"
              >
                <MapPin className="w-5 h-5" />
                Get Directions
              </a>
            )}
            {website && (
              <a 
                href={website.startsWith('http') ? website : `https://${website}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-white hover:bg-stone-50 text-[#2A6B7C] border-2 border-[#2A6B7C] font-medium rounded-lg transition-colors"
              >
                <Globe className="w-5 h-5" />
                Visit Website
              </a>
            )}
            {phone && (
              <a 
                href={`tel:${phone}`}
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-white hover:bg-stone-50 text-[#2A6B7C] border-2 border-stone-300 font-medium rounded-lg transition-colors"
              >
                <Phone className="w-5 h-5" />
                Call Now
              </a>
            )}
          </div>
        </div>
      </div>



      {/* Main Content */}

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12">

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">

          

          {/* Left Column - Main Content */}

          <div className="lg:col-span-2 space-y-6">

            {/* About Section */}
            <section className="bg-white rounded-lg shadow-sm border border-stone-200 p-6 md:p-8">
              <div className="flex items-start justify-between mb-4">
                <h2 className="font-serif text-2xl md:text-3xl text-[#5F4B32] font-bold">
                  About {name}
                </h2>
                {googlePriceLevel !== null && googlePriceLevel !== undefined && (
                  <span className="text-stone-600 text-lg font-medium">
                    {'$'.repeat(googlePriceLevel)}
                  </span>
                )}
              </div>
              
              <p className="text-base md:text-lg text-stone-700 leading-relaxed mb-4">
                {getPrimaryDescription()}
              </p>
              
              {/* If there's a secondary description, show in disclosure */}
              {hasSecondaryDescription() && (
                <details className="mt-4">
                  <summary className="text-sm text-[#2A6B7C] hover:text-[#E16D3D] cursor-pointer font-medium">
                    Read more about this bookshop
                  </summary>
                  <p className="mt-3 text-base text-stone-600 leading-relaxed">
                    {getSecondaryDescription()}
                  </p>
                </details>
              )}
            </section>

            {/* Google Photos Gallery */}
            {googlePhotos && googlePhotos.length > 0 && (
              <section className="bg-white rounded-lg shadow-sm border border-stone-200 p-6 md:p-8">
                <h3 className="font-serif text-xl md:text-2xl text-[#5F4B32] font-bold mb-4">Photos</h3>
                
                {/* Mobile Carousel (< 768px) */}
                <div className="md:hidden relative mb-4">
                  <div className="relative aspect-[4/3] rounded-lg overflow-hidden bg-stone-200">
                    <img 
                      src={getPhotoUrl(googlePhotos[currentPhotoIndex]?.photo_reference, 800)}
                      alt={`${name} - Photo ${currentPhotoIndex + 1}`}
                      className="w-full h-full object-cover"
                      loading="lazy"
                      onError={(e) => {
                        e.currentTarget.src = "https://images.unsplash.com/photo-1507842217343-583bb7270b66?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&h=600";
                      }}
                    />
                    
                    {/* Navigation Buttons */}
                    {googlePhotos.length > 1 && (
                      <>
                        <button 
                          onClick={() => setCurrentPhotoIndex(prev => prev === 0 ? googlePhotos.length - 1 : prev - 1)}
                          className="absolute left-2 top-1/2 -translate-y-1/2 bg-white/90 hover:bg-white rounded-full p-2 shadow-lg"
                          aria-label="Previous photo"
                        >
                          <ChevronLeft className="w-5 h-5 text-[#5F4B32]" />
                        </button>
                        <button 
                          onClick={() => setCurrentPhotoIndex(prev => prev === googlePhotos.length - 1 ? 0 : prev + 1)}
                          className="absolute right-2 top-1/2 -translate-y-1/2 bg-white/90 hover:bg-white rounded-full p-2 shadow-lg"
                          aria-label="Next photo"
                        >
                          <ChevronRight className="w-5 h-5 text-[#5F4B32]" />
                        </button>
                        
                        {/* Counter */}
                        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 bg-black/60 text-white text-xs px-3 py-1 rounded-full">
                          {currentPhotoIndex + 1} / {googlePhotos.length}
                        </div>
                      </>
                    )}
                  </div>
                </div>
                
                {/* Desktop Grid (>= 768px) */}
                <div className="hidden md:grid grid-cols-2 lg:grid-cols-3 gap-4">
                  {googlePhotos.map((photo, index) => (
                    <div 
                      key={index}
                      className="relative aspect-[4/3] rounded-lg overflow-hidden bg-stone-200 group cursor-pointer"
                    >
                      <img 
                        src={getPhotoUrl(photo.photo_reference, 400)}
                        alt={`${name} - Photo ${index + 1}`}
                        className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                        loading="lazy"
                        onError={(e) => {
                          e.currentTarget.src = "https://images.unsplash.com/photo-1507842217343-583bb7270b66?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&h=300";
                        }}
                      />
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors"></div>
                    </div>
                  ))}
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



            {/* Features Section */}

            <section 

              className="bg-white rounded-lg shadow-sm border border-stone-200 p-6 md:p-8"

            >

              <h2 className="font-serif text-2xl md:text-3xl text-[#5F4B32] font-bold mb-4">

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

            </section>

          </div>



          {/* Right Column - Store Information Sidebar */}

          <div className="lg:col-span-1">

            <div 

              className="bg-white rounded-lg shadow-sm border border-stone-200 p-6 mb-6"

              style={{ minHeight: '400px' }}

            >

              <h2 className="font-serif text-xl md:text-2xl text-[#5F4B32] font-bold mb-6">
                Store Information
              </h2>

              <div className="space-y-6">

                {/* Address */}

                {(street || city) && (

                  <div className="flex gap-3">

                    <MapPin className="w-5 h-5 text-[#2A6B7C] flex-shrink-0 mt-0.5" aria-hidden="true" />

                    <div className="text-sm">

                      <p className="font-bold text-stone-900 mb-1.5">Address</p>

                      <p className="text-stone-700 leading-relaxed whitespace-pre-line">

                        {fullAddress}

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



                {/* Hours */}

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

              </div>



              {/* CTA Buttons */}

              <div className="mt-8 pt-6 border-t border-stone-200 space-y-3">

                {website && (

                  <a

                    href={website.startsWith('http') ? website : `https://${website}`}

                    target="_blank"

                    rel="noopener noreferrer"

                    className="block w-full bg-[#E16D3D] hover:bg-[#C55A2F] text-white text-center py-3 px-4 rounded-lg font-medium transition-colors"

                  >

                    Visit Website

                  </a>

                )}

                

                {(latitude && longitude) && (

                  <a

                    href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(

                      `${name}${street ? ` ${street}` : ''} ${city}, ${state}${zip ? ` ${zip}` : ''}`

                    )}`}

                    target="_blank"

                    rel="noopener noreferrer"

                    className="block w-full bg-white hover:bg-stone-50 text-[#2A6B7C] text-center py-3 px-4 rounded-lg font-medium border-2 border-[#2A6B7C] transition-colors"

                  >

                    Get Directions on Google Maps

                  </a>

                )}

              </div>

            </div>



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

