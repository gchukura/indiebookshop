import React from 'react';

import { Link } from 'wouter';

import { ArrowRight, MapPin } from 'lucide-react';

import { useQuery } from '@tanstack/react-query';

import { Bookstore } from '@shared/schema';

import { generateSlugFromName } from '@/lib/linkUtils';

import BookshopIcon from '@/components/BookshopIcon';



interface RelatedBookshopsProps {

  currentBookshop: Bookstore;

  maxResults?: number;

}



const RelatedBookshops: React.FC<RelatedBookshopsProps> = ({ 

  currentBookshop, 

  maxResults = 12 

}) => {

  // Fetch bookshops in the same state, preferably same city first
  const { data: filteredBookshops, isLoading: isLoadingFilter } = useQuery<Bookstore[]>({
    queryKey: [`/api/bookstores/filter?state=${currentBookshop.state}`],
    enabled: !!currentBookshop.state,
  });

  // Process and sort the filtered bookshops
  const processedBookshopIds = React.useMemo(() => {
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
    
    return sorted.slice(0, maxResults).map(shop => shop.id);
  }, [filteredBookshops, currentBookshop.id, currentBookshop.city, maxResults]);

  // Fetch full bookshop data using batch endpoint (optimized - single API call)
  // Fallback to individual calls if batch endpoint fails
  const bookshopQueries = useQuery<Bookstore[]>({
    queryKey: ['related-bookshops-full', processedBookshopIds],
    queryFn: async () => {
      if (processedBookshopIds.length === 0) return [];
      
      try {
        // Use batch endpoint for better performance - single API call instead of N calls
        const idsParam = processedBookshopIds.join(',');
        const res = await fetch(`/api/bookstores/batch?ids=${idsParam}`);
        
        if (!res.ok) {
          // If batch endpoint fails, fallback to individual calls
          if (process.env.NODE_ENV === 'development') {
            console.warn('Batch endpoint failed, falling back to individual calls');
          }
          throw new Error('Batch endpoint failed');
        }
        
        const data = await res.json();
        
        // Check if we got an array (success) or an error object
        if (Array.isArray(data)) {
          return data as Bookstore[];
        }
        
        // If not an array, fallback to individual calls
        throw new Error('Batch endpoint returned invalid data');
      } catch (error) {
        // Fallback: Fetch each bookshop individually
        if (process.env.NODE_ENV === 'development') {
          console.warn('Batch endpoint failed, using individual calls as fallback');
        }
        
        try {
          const promises = processedBookshopIds.map(async (id) => {
            try {
              const res = await fetch(`/api/bookstores/${id}`);
              if (!res.ok) {
                throw new Error(`Failed to fetch bookshop ${id}: ${res.statusText}`);
              }
              return await res.json() as Bookstore;
            } catch (error) {
              if (process.env.NODE_ENV === 'development') {
                console.error(`Error fetching bookshop ${id}:`, error);
              }
              return null;
            }
          });
          
          const results = await Promise.all(promises);
          return results.filter((bookshop): bookshop is Bookstore => bookshop !== null);
        } catch (fallbackError) {
          if (process.env.NODE_ENV === 'development') {
            console.error('Error in fallback fetch:', fallbackError);
          }
          return [];
        }
      }
    },
    enabled: processedBookshopIds.length > 0,
  });

  const relatedBookshops = bookshopQueries.data || [];
  const isLoading = isLoadingFilter || bookshopQueries.isLoading;



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



      {/* Bookshop Cards Grid - Stacked on mobile, side-by-side on larger screens */}

      <div className="flex flex-col sm:grid sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">

        {relatedBookshops.map((bookshop) => {

          const slug = generateSlugFromName(bookshop.name) || String(bookshop.id);

          const isSameCity = bookshop.city === currentBookshop.city;

          

          return (

                <Link

                  key={bookshop.id}

                  to={`/bookshop/${slug}`}

                  className="group block"

                >

                  <div className="relative bg-white border-2 border-stone-200 hover:border-[#E16D3D] rounded-lg overflow-hidden shadow-md hover:shadow-xl transition-all duration-300 sm:hover:-translate-y-1 sm:hover:scale-[1.02] h-full flex flex-col">

                    {/* Bookshop Image Thumbnail */}
                    <div className="relative w-full h-32 overflow-hidden bg-stone-100">
                      {(() => {
                        // Use first Google photo if available, otherwise fall back to imageUrl
                        const googlePhotos = bookshop.googlePhotos;
                        let photoReference = null;
                        
                        if (googlePhotos && Array.isArray(googlePhotos) && googlePhotos.length > 0) {
                          const firstPhoto = googlePhotos[0];
                          photoReference = firstPhoto?.photo_reference;
                        }
                        
                        const imageSrc = photoReference 
                          ? `/api/place-photo?photo_reference=${encodeURIComponent(photoReference)}&maxwidth=400`
                          : bookshop.imageUrl;
                        
                        if (imageSrc) {
                          return (
                            <img
                              src={imageSrc}
                              alt={`${bookshop.name} in ${bookshop.city}, ${bookshop.state}`}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                              loading="lazy"
                              onError={(e) => {
                                e.currentTarget.style.display = 'none';
                                const placeholder = e.currentTarget.nextElementSibling;
                                if (placeholder) {
                                  placeholder.classList.remove('hidden');
                                }
                              }}
                            />
                          );
                        }
                        return null;
                      })()}
                      <div className={`w-full h-full flex items-center justify-center bg-gradient-to-br from-stone-100 to-stone-200 ${(() => {
                        const googlePhotos = bookshop.googlePhotos;
                        let photoReference = null;
                        
                        if (googlePhotos && Array.isArray(googlePhotos) && googlePhotos.length > 0) {
                          const firstPhoto = googlePhotos[0];
                          photoReference = firstPhoto?.photo_reference;
                        }
                        
                        return !photoReference && !bookshop.imageUrl ? '' : 'hidden';
                      })()}`}>
                        <BookshopIcon size={50} className="opacity-60" />
                      </div>
                      
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



      {/* See All Link - Enhanced styling */}
      <div className="mt-6 sm:mt-8 pt-4 sm:pt-6 border-t border-stone-200 text-center">

        <Link

          to={`/directory/state/${currentBookshop.state}`}

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
