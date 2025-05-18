import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { SEO } from "@/components/SEO";
import { Button } from "@/components/ui/button";
import { Bookstore } from "@shared/schema";
import { createCountyDirectoryUrl, getStateAbbreviationFromName } from "@/lib/urlUtils";
import { BASE_URL, MAIN_KEYWORDS } from "@/lib/seo";

type StateWithCounties = {
  state: string;
  counties: string[];
};

const CountiesDirectory = () => {
  const [statesWithCounties, setStatesWithCounties] = useState<StateWithCounties[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch all bookshops
  const { data: bookshops, isError } = useQuery<Bookstore[]>({
    queryKey: ['bookshops'],
    queryFn: async () => {
      const response = await fetch('/api/bookstores');
      if (!response.ok) {
        throw new Error('Failed to fetch bookshops');
      }
      return response.json();
    }
  });

  // Process bookshops to extract state and county information
  useEffect(() => {
    if (bookshops && bookshops.length > 0) {
      // Only include bookshops with county data
      const bookshopsWithCounty = bookshops.filter(shop => shop.county);
      
      // Create a map of states to counties
      const stateCountyMap = new Map<string, Set<string>>();
      
      bookshopsWithCounty.forEach(shop => {
        if (!shop.county) return;
        
        const state = shop.state;
        const county = shop.county;
        
        if (!stateCountyMap.has(state)) {
          stateCountyMap.set(state, new Set());
        }
        
        stateCountyMap.get(state)?.add(county);
      });
      
      // Convert the map to an array of StateWithCounties
      const statesArray: StateWithCounties[] = Array.from(stateCountyMap.entries())
        .map(([state, countiesSet]) => ({
          state,
          counties: Array.from(countiesSet).sort()
        }))
        .sort((a, b) => a.state.localeCompare(b.state));
      
      setStatesWithCounties(statesArray);
      setIsLoading(false);
    }
  }, [bookshops]);

  return (
    <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <SEO
        title="Browse Independent Bookshops by County | IndiebookShop.com"
        description="Discover local independent bookshops across counties in the United States. Find indie bookstores in your county or explore new areas."
        keywords={[...MAIN_KEYWORDS, "bookshops by county", "independent bookshops by county", "US county bookstores", "local county bookstores"]}
        canonicalUrl={`${BASE_URL}/directory/counties`}
      />

      <h1 className="text-3xl font-serif font-bold text-[#5F4B32] mb-6">
        Browse Independent Bookshops by County
      </h1>
      
      <p className="text-gray-600 mb-8 max-w-3xl">
        Explore indie bookshops across counties in the United States. Each county offers a unique 
        collection of local, independent bookstores waiting to be discovered. Select a state below 
        to view counties with independent bookshops.
      </p>

      {isLoading ? (
        <div className="text-center py-10">
          <p>Loading county information...</p>
        </div>
      ) : isError ? (
        <div className="text-center py-10">
          <p>Error loading county information. Please try again later.</p>
        </div>
      ) : statesWithCounties.length === 0 ? (
        <div className="text-center py-10">
          <p>No county information available at this time.</p>
        </div>
      ) : (
        <div className="space-y-8">
          {statesWithCounties.map(({ state, counties }) => (
            <div key={state} className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-2xl font-serif font-bold text-[#5F4B32] mb-4">
                {state}
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                {counties.map(county => (
                  <Link
                    key={`${state}-${county}`}
                    href={createCountyDirectoryUrl(
                      getStateAbbreviationFromName(state) || state,
                      county
                    )}
                  >
                    <Button
                      variant="outline"
                      className="w-full justify-start py-2 px-4 hover:bg-[#2A6B7C]/10"
                    >
                      {county}
                    </Button>
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default CountiesDirectory;