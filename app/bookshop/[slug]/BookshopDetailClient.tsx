'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { MapPin, Phone, Globe, Star, Navigation, ChevronLeft, ChevronRight, ExternalLink } from 'lucide-react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { Bookstore, Feature, Event } from '@/shared/schema';
import { LocalBusinessSchema, BreadcrumbSchema } from '@/components/StructuredData';
import SingleLocationMap from '@/components/SingleLocationMap';
import RelatedBookshops from '@/components/RelatedBookshops';
import { Button } from '@/components/ui/button';

type BookshopDetailClientProps = {
  bookstore: Bookstore;
  canonicalSlug: string;
};

export default function BookshopDetailClient({ bookstore, canonicalSlug }: BookshopDetailClientProps) {
  const router = useRouter();

  // Fetch features
  const { data: features } = useQuery<Feature[]>({
    queryKey: ['/api/features'],
  });

  // Fetch events for this bookshop
  const { data: events } = useQuery<Event[]>({
    queryKey: [`/api/bookstores/${bookstore.id}/events`],
    enabled: !!bookstore.id,
  });

  // Get feature names for the bookshop
  const bookshopFeatures = useMemo(() => {
    if (!features || !bookstore.featureIds) return [];
    return features.filter(feature => 
      bookstore.featureIds?.includes(feature.id) || false
    );
  }, [features, bookstore.featureIds]);

  // State for photo carousel
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);

  // Helper to extract photo reference from photo object/string
  const extractPhotoReference = (photo: any): string | null => {
    if (!photo) return null;
    if (typeof photo === 'string') return photo;
    if (typeof photo === 'object' && photo.photo_reference) {
      return photo.photo_reference;
    }
    return null;
  };

  // Helper to get photo URL
  const getPhotoUrl = (photoReference: string, maxWidth: number = 400): string => {
    if (!photoReference) return '';
    return `/api/place-photo?photo_reference=${encodeURIComponent(photoReference)}&maxwidth=${maxWidth}`;
  };

  // Get gallery photos (all Google photos)
  const galleryPhotos = useMemo(() => {
    let photos = bookstore.googlePhotos;
    // Handle case where photos might be a JSON string
    if (photos && typeof photos === 'string') {
      try {
        photos = JSON.parse(photos);
      } catch (e) {
        // If parsing fails, treat as null
        photos = null;
      }
    }
    if (!photos || !Array.isArray(photos) || photos.length === 0) {
      return [];
    }
    return photos;
  }, [bookstore.googlePhotos]);

  // Reset carousel index when gallery photos change
  useEffect(() => {
    setCurrentPhotoIndex(0);
  }, [galleryPhotos]);

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

  // Redirect to canonical URL if needed
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const currentPath = window.location.pathname;
      const canonicalPath = `/bookshop/${canonicalSlug}`;

      if (currentPath !== canonicalPath && canonicalSlug) {
        router.replace(canonicalPath);
      }
    }
  }, [canonicalSlug, router]);

  // Priority-based description for UI display
  const displayDescription =
    (bookstore.googleDescription && bookstore.googleDescription.length >= 100 && bookstore.googleDescription) ||
    (bookstore.aiGeneratedDescription && bookstore.descriptionValidated && bookstore.aiGeneratedDescription) ||
    bookstore.description ||
    undefined;

  // Breadcrumb schema items
  const breadcrumbItems = [
    { name: 'Home', url: 'https://www.indiebookshop.com' },
    { name: 'Directory', url: 'https://www.indiebookshop.com/directory' },
  ];

  if (bookstore.state) {
    breadcrumbItems.push({
      name: bookstore.state,
      url: `https://www.indiebookshop.com/directory?state=${bookstore.state}`,
    });
  }

  breadcrumbItems.push({
    name: bookstore.name,
    url: `https://www.indiebookshop.com/bookshop/${canonicalSlug}`,
  });

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Structured Data */}
      <LocalBusinessSchema bookstore={bookstore} />
      <BreadcrumbSchema items={breadcrumbItems} />

      {/* Breadcrumbs */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 py-3">
          <nav className="flex items-center space-x-2 text-sm">
            <Link href="/" className="text-[#2A6B7C] hover:underline">
              Home
            </Link>
            <span className="text-gray-400">/</span>
            <Link href="/directory" className="text-[#2A6B7C] hover:underline">
              Directory
            </Link>
            <span className="text-gray-400">/</span>
            {bookstore.state && (
              <>
                <Link href={`/directory?state=${bookstore.state}`} className="text-[#2A6B7C] hover:underline">
                  {bookstore.state}
                </Link>
                <span className="text-gray-400">/</span>
              </>
            )}
            <span className="text-gray-700">{bookstore.name}</span>
          </nav>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - Main Info */}
          <div className="lg:col-span-2 space-y-6">
            {/* Header */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h1 className="font-serif text-3xl md:text-4xl font-bold text-[#5F4B32] mb-4">{bookstore.name}</h1>

              {/* Location */}
              <div className="flex items-start text-gray-700 mb-4">
                <MapPin className="w-5 h-5 mr-2 mt-1 flex-shrink-0 text-[#2A6B7C]" />
                <div>
                  {bookstore.street && <div>{bookstore.street}</div>}
                  <div>
                    {bookstore.city}, {bookstore.state} {bookstore.zip}
                  </div>
                </div>
              </div>

              {/* Rating */}
              {bookstore.googleRating && (
                <div className="flex items-center mb-4">
                  <Star className="w-5 h-5 text-yellow-600 fill-current mr-1" />
                  <span className="font-semibold text-gray-900">{bookstore.googleRating}</span>
                  {bookstore.googleReviewCount && <span className="text-gray-600 ml-1">({bookstore.googleReviewCount.toLocaleString()} reviews)</span>}
                </div>
              )}

              {/* Description */}
              {displayDescription && (
                <div className="prose prose-sm max-w-none">
                  <p className="text-gray-700 leading-relaxed">{displayDescription}</p>
                </div>
              )}

              {/* Features & Specialties */}
              {bookshopFeatures.length > 0 && (
                <div className="mt-6">
                  <h3 className="font-serif text-xl font-bold text-[#5F4B32] mb-4">Features & Specialties</h3>
                  <div className="flex flex-wrap gap-2">
                    {bookshopFeatures.map(feature => (
                      <span 
                        key={feature.id} 
                        className="bg-[rgba(42,107,124,0.1)] text-[#2A6B7C] rounded-full px-3 py-1 text-xs font-semibold"
                      >
                        {feature.name}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Google Photos Gallery */}
            {galleryPhotos.length > 0 && (
              <div className="bg-white rounded-lg shadow-md p-6">
                <h2 className="font-serif text-2xl font-bold text-[#5F4B32] mb-4">Photos</h2>
                
                {/* Mobile Carousel (< 768px) */}
                <div className="md:hidden relative mb-4">
                  <div className="relative aspect-[4/3] rounded-lg overflow-hidden bg-gray-200">
                    <img 
                      src={(() => {
                        const photo = galleryPhotos[currentPhotoIndex];
                        const photoRef = extractPhotoReference(photo);
                        if (!photoRef) return '';
                        return getPhotoUrl(photoRef, 800);
                      })()}
                      alt={`${bookstore.name} - Photo ${currentPhotoIndex + 1}`}
                      className="w-full h-full object-cover"
                      loading="lazy"
                      onError={(e) => {
                        e.currentTarget.src = "https://images.unsplash.com/photo-1507842217343-583bb7270b66?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&h=600";
                      }}
                    />
                    
                    {/* Navigation Buttons */}
                    {galleryPhotos.length > 1 && (
                      <>
                        <button 
                          onClick={() => setCurrentPhotoIndex(prev => prev === 0 ? galleryPhotos.length - 1 : prev - 1)}
                          className="absolute left-2 top-1/2 -translate-y-1/2 bg-white/90 hover:bg-white rounded-full p-2 shadow-lg"
                          aria-label="Previous photo"
                        >
                          <ChevronLeft className="w-5 h-5 text-[#5F4B32]" />
                        </button>
                        <button 
                          onClick={() => setCurrentPhotoIndex(prev => prev === galleryPhotos.length - 1 ? 0 : prev + 1)}
                          className="absolute right-2 top-1/2 -translate-y-1/2 bg-white/90 hover:bg-white rounded-full p-2 shadow-lg"
                          aria-label="Next photo"
                        >
                          <ChevronRight className="w-5 h-5 text-[#5F4B32]" />
                        </button>
                        
                        {/* Counter */}
                        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 bg-black/60 text-white text-xs px-3 py-1 rounded-full">
                          {currentPhotoIndex + 1} / {galleryPhotos.length}
                        </div>
                      </>
                    )}
                  </div>
                </div>
                
                {/* Desktop Grid (>= 768px) */}
                <div className="hidden md:grid grid-cols-2 lg:grid-cols-3 gap-4">
                  {galleryPhotos.map((photo, index) => {
                    const photoRef = extractPhotoReference(photo);
                    
                    if (!photoRef || photoRef.length < 10) {
                      return null;
                    }
                    
                    return (
                      <div 
                        key={index}
                        className="relative aspect-[4/3] rounded-lg overflow-hidden bg-gray-200 group cursor-pointer"
                      >
                        <img 
                          src={getPhotoUrl(photoRef, 400)}
                          alt={`${bookstore.name} - Photo ${index + 1}`}
                          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                          loading="lazy"
                          onError={(e) => {
                            e.currentTarget.src = "https://images.unsplash.com/photo-1507842217343-583bb7270b66?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&h=300";
                          }}
                        />
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors"></div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Customer Reviews Section */}
            {bookstore.googleReviews && Array.isArray(bookstore.googleReviews) && bookstore.googleReviews.length > 0 && (
              <div className="bg-white rounded-lg shadow-md p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="font-serif text-2xl font-bold text-[#5F4B32]">Customer Reviews</h2>
                  {bookstore.googleRating && bookstore.googleReviewCount && (
                    <div className="flex items-center gap-2 text-sm">
                      <Star className="w-4 h-4 text-[#E16D3D] fill-current" />
                      <span className="font-semibold text-[#5F4B32]">{formatRating(bookstore.googleRating)?.toFixed(1)}</span>
                      <span className="text-gray-500">({bookstore.googleReviewCount.toLocaleString()})</span>
                    </div>
                  )}
                </div>
                
                <div className="space-y-6">
                  {bookstore.googleReviews.slice(0, 3).map((review, index) => (
                    <div key={index} className={index < Math.min(bookstore.googleReviews!.length, 3) - 1 ? "border-b border-gray-200 pb-6" : ""}>
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <p className="font-semibold text-[#5F4B32]">{review.author_name}</p>
                          <p className="text-xs text-gray-500">{formatReviewTime(review.time)}</p>
                        </div>
                        <div className="flex items-center gap-1">
                          {[...Array(5)].map((_, i) => (
                            <Star 
                              key={i}
                              className={`w-4 h-4 ${i < review.rating ? 'text-[#E16D3D] fill-current' : 'text-gray-300'}`}
                            />
                          ))}
                        </div>
                      </div>
                      <p className="text-gray-700 leading-relaxed">{review.text}</p>
                    </div>
                  ))}
                </div>
                
                {bookstore.googlePlaceId && (
                  <div className="mt-6 pt-6 border-t border-gray-200 text-center">
                    <a 
                      href={`https://www.google.com/maps/place/?q=place_id:${bookstore.googlePlaceId}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 text-sm font-medium text-[#2A6B7C] hover:text-[#E16D3D] transition-colors"
                    >
                      Read all reviews on Google
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  </div>
                )}
              </div>
            )}

            {/* Events */}
            {events && events.length > 0 && (
              <div className="bg-white rounded-lg shadow-md p-6">
                <h2 className="font-serif text-2xl font-bold text-[#5F4B32] mb-4">Upcoming Events</h2>
                <div className="space-y-4">
                  {events.map(event => (
                    <div key={event.id} className="border-l-4 border-[#E16D3D] pl-4 py-2">
                      <p className="font-bold text-[#5F4B32]">{event.title}</p>
                      <p className="text-sm text-gray-600 mt-1">{event.date} • {event.time}</p>
                      <p className="text-sm mt-2 text-gray-700">{event.description}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Contact Info */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="font-serif text-2xl font-bold text-[#5F4B32] mb-4">Contact Information</h2>

              <div className="space-y-3">
                {/* Phone */}
                {bookstore.phone && (
                  <div className="flex items-center">
                    <Phone className="w-5 h-5 mr-3 text-[#2A6B7C]" />
                    <a href={`tel:${bookstore.phone}`} className="text-[#2A6B7C] hover:underline">
                      {bookstore.formattedPhone || bookstore.phone}
                    </a>
                  </div>
                )}

                {/* Website */}
                {bookstore.website && (
                  <div className="flex items-center">
                    <Globe className="w-5 h-5 mr-3 text-[#2A6B7C]" />
                    <a href={bookstore.website} target="_blank" rel="noopener noreferrer" className="text-[#2A6B7C] hover:underline flex items-center">
                      Visit Website
                      <span className="ml-1 text-xs">↗</span>
                    </a>
                  </div>
                )}

                {/* Google Maps */}
                {bookstore.googleMapsUrl && (
                  <div className="flex items-center">
                    <MapPin className="w-5 h-5 mr-3 text-[#2A6B7C]" />
                    <a href={bookstore.googleMapsUrl} target="_blank" rel="noopener noreferrer" className="text-[#2A6B7C] hover:underline flex items-center">
                      View on Google Maps
                      <span className="ml-1 text-xs">↗</span>
                    </a>
                  </div>
                )}
              </div>
            </div>

            {/* Hours */}
            {(bookstore.openingHoursJson?.weekday_text || bookstore.hours) && (
              <div className="bg-white rounded-lg shadow-md p-6">
                <h2 className="font-serif text-2xl font-bold text-[#5F4B32] mb-4">Hours</h2>
                {bookstore.openingHoursJson?.weekday_text ? (
                  <>
                    <div className="space-y-2">
                      {bookstore.openingHoursJson.weekday_text.map((hours, index) => (
                        <div key={index} className="text-gray-700">
                          {hours}
                        </div>
                      ))}
                    </div>
                    {bookstore.openingHoursJson.open_now !== undefined && (
                      <div className="mt-4 inline-block">
                        <span className={`px-3 py-1 rounded-full text-sm font-semibold ${bookstore.openingHoursJson.open_now ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                          {bookstore.openingHoursJson.open_now ? 'Open Now' : 'Closed'}
                        </span>
                      </div>
                    )}
                  </>
                ) : bookstore.hours ? (
                  <div className="grid grid-cols-2 gap-1 text-sm">
                    {Object.entries(bookstore.hours).map(([day, hours]) => (
                      <React.Fragment key={day}>
                        <p className="font-medium">{day}:</p>
                        <p>{hours}</p>
                      </React.Fragment>
                    ))}
                  </div>
                ) : null}
              </div>
            )}
          </div>

          {/* Right Column - Map & CTA */}
          <div className="lg:col-span-1 space-y-6">
            {/* Map */}
            {bookstore.latitude && bookstore.longitude && (
              <div className="bg-white rounded-lg shadow-md p-4">
                <h3 className="font-serif text-xl font-bold text-[#5F4B32] mb-4">Location</h3>
                <div className="bg-gray-200 rounded-lg overflow-hidden" style={{ height: '300px' }}>
                  <SingleLocationMap 
                    latitude={bookstore.latitude} 
                    longitude={bookstore.longitude} 
                  />
                </div>
                <p className="text-sm text-gray-600 mt-2 mb-3">
                  {bookstore.city}, {bookstore.state}
                </p>
                <a 
                  href={`https://www.google.com/maps/dir/?api=1&destination=${bookstore.latitude},${bookstore.longitude}`}
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="block w-full"
                >
                  <Button className="w-full bg-[#2A6B7C] hover:bg-[#2A6B7C]/90 text-white">
                    <Navigation className="h-4 w-4 mr-2" /> Get Directions
                  </Button>
                </a>
              </div>
            )}

            {/* CTA */}
            <div className="bg-[#2A6B7C] text-white rounded-lg shadow-md p-6">
              <h3 className="font-serif text-xl font-bold mb-3">Support This Bookshop</h3>
              <p className="text-sm mb-4 opacity-90">Independent bookshops are the heart of local communities. Visit, shop, and help keep them thriving!</p>
              {bookstore.website && (
                <a href={bookstore.website} target="_blank" rel="noopener noreferrer" className="block w-full bg-white text-[#2A6B7C] text-center py-3 rounded-lg font-semibold hover:bg-gray-100 transition-colors">
                  Visit Their Website
                </a>
              )}
            </div>
          </div>
        </div>

        {/* Related Bookshops */}
        {bookstore.state && (
          <div className="mt-12">
            <RelatedBookshops currentBookshop={bookstore} />
          </div>
        )}
      </div>
    </div>
  );
}
