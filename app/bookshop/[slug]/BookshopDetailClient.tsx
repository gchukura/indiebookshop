'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { MapPin, Phone, Globe, Star, ExternalLink } from 'lucide-react';
import Link from 'next/link';
import { Bookstore } from '@/shared/schema';
import { getStateAbbrev } from '@/lib/state-utils';
import { LocalBusinessSchema, BreadcrumbSchema } from '@/components/StructuredData';
import SingleLocationMap from '@/components/SingleLocationMap';
import { getBookshopThumbnailUrl } from '@/lib/bookshop-image';
import BookshopImage from '@/components/BookshopImage';

type BookshopDetailClientProps = {
  bookstore: Bookstore;
  canonicalSlug: string;
  relatedBookshops?: Bookstore[];
};

interface GoogleReview {
  author_name: string;
  rating: number;
  text: string;
  time: number;
}

export default function BookshopDetailClient({ bookstore, canonicalSlug, relatedBookshops = [] }: BookshopDetailClientProps) {
  const router = useRouter();
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);

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

  // Priority-based description for UI display (bookstores.description first)
  const displayDescription =
    (bookstore.description && bookstore.description.trim().length > 0 && bookstore.description.trim()) ||
    (bookstore.googleDescription && bookstore.googleDescription.trim().length > 0 && bookstore.googleDescription.trim()) ||
    (bookstore.aiGeneratedDescription && bookstore.descriptionValidated && bookstore.aiGeneratedDescription) ||
    undefined;

  // Helper to extract photo reference from photo object or string (DB uses snake_case)
  const extractPhotoReference = (photo: any): string | null => {
    if (!photo) return null;
    if (typeof photo === 'string') {
      const ref = String(photo).trim();
      return ref.length > 10 ? ref : null;
    }
    if (typeof photo === 'object') {
      const ref = photo.photo_reference ?? photo.photoReference ?? null;
      if (ref && typeof ref === 'string' && ref.trim().length > 10) return ref.trim();
    }
    return null;
  };

  // Helper to get photo URL (proxied via API to avoid exposing API key)
  const getPhotoUrl = (photoReference: string, maxWidth: number = 800): string => {
    return `/api/place-photo?photo_reference=${encodeURIComponent(photoReference)}&maxwidth=${maxWidth}`;
  };

  // Parse Google photos: support both camelCase (mapped) and snake_case (raw) from server
  const rawPhotos = bookstore.googlePhotos ?? (bookstore as any).google_photos;
  const googlePhotosArray = Array.isArray(rawPhotos) ? rawPhotos : [];
  const galleryPhotos = googlePhotosArray.filter(photo => extractPhotoReference(photo) !== null);

  // Parse Google reviews array
  const googleReviews: GoogleReview[] = Array.isArray(bookstore.googleReviews) 
    ? bookstore.googleReviews.filter((review: any) => review && review.author_name && review.text)
    : [];

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

  // Breadcrumb schema items
  const breadcrumbItems = [
    { name: 'Home', url: 'https://www.indiebookshop.com' },
    { name: 'Directory', url: 'https://www.indiebookshop.com/directory' },
  ];

  if (bookstore.state) {
    breadcrumbItems.push({
      name: bookstore.state,
      url: `https://www.indiebookshop.com/directory?state=${encodeURIComponent(getStateAbbrev(bookstore.state))}`,
    });
  }

  if (bookstore.city && bookstore.state) {
    breadcrumbItems.push({
      name: bookstore.city,
      url: `https://www.indiebookshop.com/directory?state=${encodeURIComponent(getStateAbbrev(bookstore.state))}&city=${encodeURIComponent(bookstore.city)}`,
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
                <Link href={`/directory?state=${encodeURIComponent(getStateAbbrev(bookstore.state))}`} className="text-[#2A6B7C] hover:underline">
                  {bookstore.state}
                </Link>
                <span className="text-gray-400">/</span>
              </>
            )}
            {bookstore.city && bookstore.state && (
              <>
                <Link href={`/directory?state=${encodeURIComponent(getStateAbbrev(bookstore.state))}&city=${encodeURIComponent(bookstore.city)}`} className="text-[#2A6B7C] hover:underline">
                  {bookstore.city}
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
            </div>

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
            {bookstore.openingHoursJson?.weekday_text && (
              <div className="bg-white rounded-lg shadow-md p-6">
                <h2 className="font-serif text-2xl font-bold text-[#5F4B32] mb-4">Hours</h2>
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
              </div>
            )}

            {/* Google Photos Gallery */}
            {galleryPhotos.length > 0 && (
              <div className="bg-white rounded-lg shadow-md p-6">
                <h2 className="font-serif text-2xl font-bold text-[#5F4B32] mb-4">Photo Gallery</h2>
                
                {/* Main featured photo */}
                {galleryPhotos.length > 0 && (
                  <div className="mb-4">
                    <div className="relative aspect-[16/9] rounded-lg overflow-hidden bg-gray-200">
                      {(() => {
                        const photoRef = extractPhotoReference(galleryPhotos[currentPhotoIndex]);
                        return photoRef ? (
                          <img
                            src={getPhotoUrl(photoRef, 1200)}
                            alt={`${bookstore.name} - Photo ${currentPhotoIndex + 1}`}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              e.currentTarget.src = 'https://images.unsplash.com/photo-1507842217343-583bb7270b66?ixlib=rb-4.0.3&auto=format&fit=crop&w=1200&h=675';
                            }}
                          />
                        ) : null;
                      })()}
                      
                      {/* Navigation arrows */}
                      {galleryPhotos.length > 1 && (
                        <>
                          <button
                            onClick={() => setCurrentPhotoIndex((prev) => (prev === 0 ? galleryPhotos.length - 1 : prev - 1))}
                            className="absolute left-4 top-1/2 -translate-y-1/2 bg-white/90 hover:bg-white text-gray-800 rounded-full p-2 shadow-lg transition-all"
                            aria-label="Previous photo"
                          >
                            ←
                          </button>
                          <button
                            onClick={() => setCurrentPhotoIndex((prev) => (prev === galleryPhotos.length - 1 ? 0 : prev + 1))}
                            className="absolute right-4 top-1/2 -translate-y-1/2 bg-white/90 hover:bg-white text-gray-800 rounded-full p-2 shadow-lg transition-all"
                            aria-label="Next photo"
                          >
                            →
                          </button>
                        </>
                      )}
                    </div>
                    
                    {/* Photo counter */}
                    {galleryPhotos.length > 1 && (
                      <div className="mt-2 text-center text-sm text-gray-600">
                        Photo {currentPhotoIndex + 1} of {galleryPhotos.length}
                      </div>
                    )}
                  </div>
                )}

                {/* Thumbnail grid */}
                {galleryPhotos.length > 1 && (
                  <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
                    {galleryPhotos.slice(0, 12).map((photo, index) => {
                      const photoRef = extractPhotoReference(photo);
                      return photoRef ? (
                        <button
                          key={index}
                          onClick={() => setCurrentPhotoIndex(index)}
                          className={`relative aspect-square rounded-lg overflow-hidden border-2 transition-all ${
                            index === currentPhotoIndex ? 'border-[#2A6B7C] ring-2 ring-[#2A6B7C]' : 'border-transparent hover:border-gray-300'
                          }`}
                        >
                          <img
                            src={getPhotoUrl(photoRef, 200)}
                            alt={`${bookstore.name} thumbnail ${index + 1}`}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              e.currentTarget.src = 'https://images.unsplash.com/photo-1507842217343-583bb7270b66?ixlib=rb-4.0.3&auto=format&fit=crop&w=200&h=200';
                            }}
                          />
                        </button>
                      ) : null;
                    })}
                  </div>
                )}
              </div>
            )}

            {/* Google Reviews */}
            {googleReviews.length > 0 && (
              <div className="bg-white rounded-lg shadow-md p-6">
                <h2 className="font-serif text-2xl font-bold text-[#5F4B32] mb-4">Customer Reviews</h2>
                
                <div className="space-y-6">
                  {googleReviews.slice(0, 5).map((review, index) => (
                    <div key={index} className={index < Math.min(googleReviews.length, 5) - 1 ? 'border-b border-gray-200 pb-6' : ''}>
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <p className="font-semibold text-[#5F4B32]">{review.author_name}</p>
                          <p className="text-xs text-gray-500">{formatReviewTime(review.time)}</p>
                        </div>
                        <div className="flex items-center gap-1">
                          {[...Array(5)].map((_, i) => (
                            <Star
                              key={i}
                              className={`w-4 h-4 ${i < review.rating ? 'text-yellow-600 fill-current' : 'text-gray-300'}`}
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
          </div>

          {/* Right Column - Map & CTA */}
          <div className="lg:col-span-1 space-y-6">
            {/* Map */}
            {bookstore.latitude && bookstore.longitude && (
              <div className="bg-white rounded-lg shadow-md p-4">
                <h3 className="font-serif text-xl font-bold text-[#5F4B32] mb-4">Location</h3>
                <div className="aspect-square rounded-lg overflow-hidden bg-gray-200">
                  <SingleLocationMap
                    latitude={bookstore.latitude}
                    longitude={bookstore.longitude}
                  />
                </div>
                <p className="text-sm text-gray-600 mt-2">
                  {bookstore.city}, {bookstore.state}
                </p>
                {bookstore.googleMapsUrl && (
                  <a
                    href={bookstore.googleMapsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-3 block w-full text-center py-2 px-4 bg-[#2A6B7C] hover:bg-[#1d5a6a] text-white rounded-lg font-semibold transition-colors text-sm"
                  >
                    Get Directions
                  </a>
                )}
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
        {relatedBookshops.length > 0 && (
          <div className="mt-12">
            <h2 className="font-serif text-2xl font-bold text-[#5F4B32] mb-6">
              {bookstore.city ? `More Bookshops in ${bookstore.city}, ${bookstore.state}` : `More Bookshops in ${bookstore.state}`}
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
              {relatedBookshops.map((shop) => (
                <Link
                  key={shop.id}
                  href={`/bookshop/${shop.slug || shop.id}`}
                  className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow group block"
                >
                  <div className="relative w-full aspect-[4/3] overflow-hidden bg-gray-100">
                    <BookshopImage
                      src={getBookshopThumbnailUrl(shop, 400)}
                      alt={`${shop.name} in ${shop.city}, ${shop.state}`}
                      className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                    />
                  </div>
                  <div className="p-6">
                    <h3 className="font-serif text-lg font-bold text-[#5F4B32] mb-2">{shop.name}</h3>
                    <div className="flex items-start text-sm text-gray-600 mb-2">
                      <MapPin className="w-4 h-4 mr-1 mt-0.5 flex-shrink-0 text-[#2A6B7C]" />
                      <span>
                        {shop.city}, {shop.state}
                      </span>
                    </div>
                    {shop.googleRating && (
                      <div className="flex items-center text-sm">
                        <Star className="w-4 h-4 text-yellow-500 fill-current mr-1" />
                        <span className="font-semibold">{shop.googleRating}</span>
                        {shop.googleReviewCount && (
                          <span className="text-gray-500 ml-1">({shop.googleReviewCount.toLocaleString()})</span>
                        )}
                      </div>
                    )}
                  </div>
                </Link>
              ))}
            </div>
            {bookstore.state && (
              <div className="bg-white rounded-lg shadow-md p-6 text-center">
                <Link href={`/directory?state=${encodeURIComponent(getStateAbbrev(bookstore.state))}`} className="text-[#2A6B7C] hover:underline font-semibold text-lg">
                  Browse all bookshops in {bookstore.state} →
                </Link>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
