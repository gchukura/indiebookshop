import React from 'react';

import { Link } from 'wouter';

import { ArrowRight, MapPin } from 'lucide-react';

import { useQuery } from '@tanstack/react-query';

import { Bookstore } from '@shared/schema';

import { generateSlugFromName } from '@/lib/linkUtils';



interface RelatedBookshopsProps {

  currentBookshop: Bookstore;

  maxResults?: number;

}



const RelatedBookshops: React.FC<RelatedBookshopsProps> = ({ 

  currentBookshop, 

  maxResults = 3 

}) => {

  // Fetch bookshops in the same state, preferably same city first

  const { data: relatedBookshops, isLoading } = useQuery<Bookstore[]>({

    queryKey: [`/api/bookstores/filter?state=${currentBookshop.state}`],

    select: (data) => {

      // Filter out current bookshop

      const filtered = data.filter(shop => shop.id !== currentBookshop.id);

      

      // Sort: same city first, then alphabetically

      const sorted = filtered.sort((a, b) => {

        // Prioritize same city

        if (a.city === currentBookshop.city && b.city !== currentBookshop.city) return -1;

        if (b.city === currentBookshop.city && a.city !== currentBookshop.city) return 1;

        

        // Then alphabetically by name

        return a.name.localeCompare(b.name);

      });

      

      return sorted.slice(0, maxResults);

    },

    enabled: !!currentBookshop.state,

  });



  if (isLoading) {

    return (

      <div className="bg-white rounded-lg shadow-sm border border-stone-200 p-6 md:p-8">

        <div className="h-8 bg-stone-200 rounded w-64 mb-8 animate-pulse" />

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

          {[1, 2, 3].map((i) => (

            <div key={i} className="h-36 bg-stone-100 rounded-lg animate-pulse" />

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

    <div className="bg-white rounded-lg shadow-sm border border-stone-200 p-6 md:p-8">

      {/* Section Header */}

      <div className="mb-6 md:mb-8">

        <h2 className="font-serif text-2xl md:text-3xl text-[#5F4B32] font-bold">

          Other bookshops nearby

        </h2>

      </div>



      {/* Bookshop Cards Grid */}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">

        {relatedBookshops.map((bookshop) => {

          const slug = generateSlugFromName(bookshop.name) || String(bookshop.id);

          const isSameCity = bookshop.city === currentBookshop.city;

          

          return (

                <Link

                  key={bookshop.id}

                  to={`/bookshop/${slug}`}

                  className="group block"

                >

                  <div className="relative bg-white border-2 border-stone-200 hover:border-[#E16D3D] rounded-lg p-5 md:p-6 transition-all duration-300 hover:shadow-lg h-full flex flex-col">

                    {/* Same City Badge */}

                    {isSameCity && (

                      <div className="absolute top-3 right-3">

                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-amber-50 border border-amber-200 text-amber-800 text-xs font-medium">

                          <MapPin className="w-3 h-3" aria-hidden="true" />

                          Nearby

                        </span>

                      </div>

                    )}



                    {/* Bookshop Name */}

                    <h3 className="font-serif text-xl md:text-2xl text-[#5F4B32] font-bold mb-2 pr-16 group-hover:text-[#E16D3D] transition-colors">

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

                </Link>

          );

        })}

      </div>



      {/* See All Link - Centered below cards */}

      <div className="mt-8 pt-6 border-t border-stone-200 text-center">

        <Link

          to={`/directory/state/${currentBookshop.state}`}

          className="inline-flex items-center gap-2 text-base font-semibold text-[#2A6B7C] hover:text-[#E16D3D] transition-colors group"

        >

          See all bookshops in {currentBookshop.state}

          <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" aria-hidden="true" />

        </Link>

      </div>

    </div>

  );

};



export default RelatedBookshops;
