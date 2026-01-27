'use client';

import React, { useMemo } from 'react';
import Link from 'next/link';
import { ArrowRight, MapPin } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { Bookstore } from '@/shared/schema';
import { generateSlugFromName } from '@/shared/utils';
import BookshopImage from './BookshopImage';

interface RelatedBookshopsProps {
  currentBookshop: Bookstore;
  maxResults?: number;
}

// Helper to extract photo reference
const extractPhotoReference = (photo: any): string | null => {
  if (!photo) return null;
  if (typeof photo === 'string') return photo;
  if (typeof photo === 'object' && photo.photo_reference) {
    return photo.photo_reference;
  }
  return null;
};

// Helper to get bookshop image URL
const getBookshopImageUrl = (bookshop: Bookstore): string => {
  // Priority 1: First Google photo if available
  if (bookshop.googlePhotos && Array.isArray(bookshop.googlePhotos) && bookshop.googlePhotos.length > 0) {
    const firstPhoto = bookshop.googlePhotos[0];
    const photoRef = extractPhotoReference(firstPhoto);
    if (photoRef) {
      return `/api/place-photo?photo_reference=${encodeURIComponent(photoRef)}&maxwidth=400`;
    }
  }
  
  // Priority 2: Existing imageUrl
  if (bookshop.imageUrl) {
    return bookshop.imageUrl;
  }
  
  // Priority 3: Fallback to Unsplash stock photo
  return 'https://images.unsplash.com/photo-1507842217343-583bb7270b66?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&h=300';
};

const RelatedBookshops: React.FC<RelatedBookshopsProps> = ({ 
  currentBookshop, 
  maxResults = 12 
}) => {
  // Fetch bookshops in the same state
  const { data: filteredBookshops, isLoading: isLoadingFilter } = useQuery<Bookstore[]>({
    queryKey: [`/api/bookstores/filter?state=${currentBookshop.state}`],
    enabled: !!currentBookshop.state,
  });

  // Process and sort the filtered bookshops
  const relatedBookshops = useMemo(() => {
    if (!filteredBookshops) return [];
    
    // Filter out current bookshop
    const filtered = filteredBookshops.filter(shop => shop.id !== currentBookshop.id);
    
    // Sort: same city first, then alphabetically
    const sorted = filtered.sort((a, b) => {
      // Prioritize same city
      if (a.city === currentBookshop.city && b.city !== currentBookshop.city) return -1;
      if (b.city === currentBookshop.city && a.city !== currentBookshop.city) return 1;
      
      // Then alphabetically by name
      return a.name.localeCompare(b.name);
    });
    
    return sorted.slice(0, maxResults);
  }, [filteredBookshops, currentBookshop.id, currentBookshop.city, maxResults]);

  const isLoading = isLoadingFilter;

  if (isLoading) {
    return (
      <div className="bg-gradient-to-br from-stone-50 to-white rounded-lg shadow-md border border-stone-200 p-4 sm:p-6 md:p-8 lg:p-10">
        <div className="h-8 bg-stone-200 rounded w-64 mb-8 animate-pulse" />
        <div className="flex flex-col sm:grid sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-white border-2 border-stone-200 rounded-lg overflow-hidden shadow-md">
              <div className="w-full aspect-[4/3] bg-stone-100 animate-pulse" />
              <div className="p-5 md:p-6 space-y-3">
                <div className="h-6 bg-stone-200 rounded w-3/4 animate-pulse" />
                <div className="h-4 bg-stone-200 rounded w-1/2 animate-pulse" />
                <div className="h-4 bg-stone-200 rounded w-1/3 animate-pulse" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!relatedBookshops || relatedBookshops.length === 0) {
    return null;
  }

  // Determine if we should show state name in subtitle (only if multiple cities)
  const uniqueCities = new Set(relatedBookshops.map(shop => shop.city));
  const showStateName = uniqueCities.size > 1;

  return (
    <div className="bg-gradient-to-br from-stone-50 to-white rounded-lg shadow-md border border-stone-200 p-4 sm:p-6 md:p-8 lg:p-10">
      {/* Section Header */}
      <div className="mb-4 sm:mb-6 md:mb-8">
        <h2 className="font-serif text-xl sm:text-2xl md:text-3xl text-[#5F4B32] font-bold">
          Other bookshops nearby
        </h2>
      </div>

      {/* Bookshop Cards Grid */}
      <div className="flex flex-col sm:grid sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
        {relatedBookshops.map((bookshop) => {
          const slug = (bookshop.slug || generateSlugFromName(bookshop.name)) || String(bookshop.id);
          const isSameCity = bookshop.city === currentBookshop.city;
          const imageUrl = getBookshopImageUrl(bookshop);

          return (
            <Link
              key={bookshop.id}
              href={`/bookshop/${slug}`}
              className="group block"
            >
              <div className="relative bg-white border-2 border-stone-200 hover:border-[#E16D3D] rounded-lg overflow-hidden shadow-md hover:shadow-xl transition-all duration-300 sm:hover:-translate-y-1 sm:hover:scale-[1.02] h-full flex flex-col">
                {/* Bookshop Image Thumbnail */}
                <div className="relative w-full h-32 overflow-hidden bg-stone-100">
                  <BookshopImage
                    src={imageUrl}
                    alt={`${bookshop.name} in ${bookshop.city}, ${bookshop.state}`}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  
                  {/* Same City Badge - positioned over image */}
                  {isSameCity && (
                    <div className="absolute top-2 right-2 z-10">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-50 border border-amber-200 text-amber-800 text-xs font-medium shadow-sm">
                        <MapPin className="w-3 h-3" aria-hidden="true" />
                        Nearby
                      </span>
                    </div>
                  )}
                </div>

                {/* Card Content */}
                <div className="p-4 sm:p-5 md:p-6 flex flex-col flex-grow">
                  {/* Bookshop Name */}
                  <h3 className="font-serif text-lg sm:text-xl md:text-2xl text-[#5F4B32] font-bold mb-2 group-hover:text-[#E16D3D] transition-colors">
                    {bookshop.name}
                  </h3>

                  {/* Location */}
                  <div className="flex items-start gap-2 text-sm text-stone-600 mb-4 flex-grow">
                    <MapPin className="w-4 h-4 flex-shrink-0 text-[#2A6B7C] mt-0.5" aria-hidden="true" />
                    <span>
                      {bookshop.city}
                      {showStateName && `, ${bookshop.state}`}
                    </span>
                  </div>

                  {/* View Details Link */}
                  <div className="flex items-center gap-2 text-sm font-semibold text-[#2A6B7C] group-hover:text-[#E16D3D] transition-colors mt-auto">
                    View details
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" aria-hidden="true" />
                  </div>
                </div>
              </div>
            </Link>
          );
        })}
      </div>

      {/* See All Link */}
      <div className="mt-6 sm:mt-8 pt-4 sm:pt-6 border-t border-stone-200 text-center">
        <Link
          href={`/directory?state=${currentBookshop.state}`}
          className="inline-flex items-center gap-2 px-6 py-3 bg-white hover:bg-[#2A6B7C] border-2 border-[#2A6B7C] text-[#2A6B7C] hover:text-white rounded-lg font-semibold transition-all duration-300 hover:shadow-lg group"
        >
          See all bookshops in {currentBookshop.state}
          <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" aria-hidden="true" />
        </Link>
      </div>
    </div>
  );
};

export default RelatedBookshops;
