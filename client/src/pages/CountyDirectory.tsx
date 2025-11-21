import { useParams, Link, useLocation } from "wouter";
import { useState, useEffect, useMemo } from "react";
import { Bookstore } from "@shared/schema";
import { generateSlugFromName } from "../lib/linkUtils";
import BookshopCard from "@/components/BookshopCard";
import MapboxMap from "@/components/MapboxMap";
import BookshopTable from "@/components/BookshopTable";
import { ErrorDisplay } from "@/components/ErrorDisplay";
import { Button } from "@/components/ui/button";
import { SEO } from "../components/SEO";
import { 
  BASE_URL, 
  DESCRIPTION_TEMPLATES, 
  generateSlug,
  generateLocationKeywords,
  generateDescription 
} from "../lib/seo";
import { getFullStateName } from "../lib/stateUtils";
import { PAGINATION } from "@/lib/constants";
import { logger } from "@/lib/logger";

const CountyDirectory = () => {
  // Get parameters from URL
  const params = useParams();
  const [_, navigate] = useLocation();
  const [multipleStatesWarning, setMultipleStatesWarning] = useState(false);
  const [matchingStates, setMatchingStates] = useState<string[]>([]);
  
  // Handle all routing patterns
  let county: string | null = null;
  let stateFromUrl: string | undefined;
  
  // New URL format: /directory/county/:state/:county
  if (params.state && params.county) {
    stateFromUrl = params.state;
    // Convert county slug to display name
    const countyParam = params.county;
    if (countyParam) {
      county = countyParam.replace(/-/g, ' ')
        .split(' ')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
      
      logger.debug('CountyDirectory URL format detected', { format: 'state/county', county, state: stateFromUrl });
    }
  }
  // Legacy URL format: /directory/county-state/:countystate
  else if (params.countystate) {
    const countyStateParam = params.countystate;
    const parts = countyStateParam ? countyStateParam.split('-') : [];
    if (parts.length >= 2) {
      // Last part is the state
      const stateIndex = parts.length - 1;
      stateFromUrl = parts[stateIndex];
      
      // Everything before the last part is the county, replace hyphens with spaces
      county = parts.slice(0, stateIndex).join(' ').replace(/-/g, ' ')
        .split(' ')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
      
      logger.debug('CountyDirectory legacy URL format detected', { format: 'county-state', county, state: stateFromUrl });
    } else {
      county = params.countystate.replace(/-/g, ' ')
        .split(' ')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
    }
  }
  
  // Component state
  const [view, setView] = useState<"map" | "list">("map");
  const [bookshops, setBookshops] = useState<Bookstore[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isError, setIsError] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const bookshopsPerPage = PAGINATION.DEFAULT_ITEMS_PER_PAGE;
  
  // Fetch bookshops based on county and possibly state
  useEffect(() => {
    const fetchBookshops = async () => {
      setIsLoading(true);
      setIsError(false);
      
      try {
        let endpoint = '';
        
        if (stateFromUrl) {
          // If we have a state, use filter endpoint with county and state
          endpoint = `/api/bookstores/filter?county=${encodeURIComponent(county!)}&state=${encodeURIComponent(stateFromUrl)}`;
          logger.info('Loading bookshops for county', { county, state: stateFromUrl });
        } else {
          // For county-only view, we'll do direct filtering in the frontend
          // Fetch all bookstores and filter them client-side for better matching
          endpoint = `/api/bookstores`;
          if (process.env.NODE_ENV === 'development') {
            logger.info('Loading all bookstores to filter for county', { county });
          }
        }
        
        // Fetch access token for Mapbox API
        const configResponse = await fetch('/api/config');
        const config = await configResponse.json();
        if (process.env.NODE_ENV === 'development') {
          logger.debug('Mapbox access token received', { hasToken: !!config.mapboxAccessToken });
        }
        
        // Fetch bookshops for this county
        const response = await fetch(endpoint);
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const allBookshops = await response.json();
        if (process.env.NODE_ENV === 'development') {
          logger.debug('Retrieved all bookshops for filtering', { count: allBookshops.length });
        }

        // Apply client-side filtering based on county
        const countyLower = county!.toLowerCase().replace(/\s+county$/i, '').replace(/-/g, ' ');
        if (process.env.NODE_ENV === 'development') {
          logger.debug('Filtering bookshops by county', { county: countyLower });
        }
        
        // Filter bookshops by county with flexible matching
        let filteredBookshops = allBookshops.filter((bookshop: any) => {
          // Skip if no county data
          if (!bookshop.county) return false;
          
          // Normalize stored county name for comparison
          const storedCounty = bookshop.county.toLowerCase().replace(/\s+county$/i, '');
          
          // Apply flexible matching
          return (
            storedCounty === countyLower ||
            storedCounty.includes(countyLower) ||
            countyLower.includes(storedCounty)
          );
        });

        // If we have a state, further filter the results
        if (stateFromUrl && filteredBookshops.length > 0) {
          const stateLower = stateFromUrl.toLowerCase();
          filteredBookshops = filteredBookshops.filter(
            (bookshop: Bookstore) => bookshop.state.toLowerCase() === stateLower
          );
          if (process.env.NODE_ENV === 'development') {
            logger.debug('Bookshops filtered by county and state', { county, state: stateFromUrl, count: filteredBookshops.length });
          }
          setMultipleStatesWarning(false); // No warning needed for state-specific pages
        } else {
          if (process.env.NODE_ENV === 'development') {
            logger.debug('Bookshops filtered by county', { county, count: filteredBookshops.length });
          }
          
          // Check for multiple states with this county name
          const stateSet = new Set<string>();
          filteredBookshops.forEach((shop: Bookstore) => stateSet.add(shop.state));
          const statesWithThisCounty = Array.from(stateSet);
          
          if (statesWithThisCounty.length > 1) {
            if (process.env.NODE_ENV === 'development') {
              logger.warn('Multiple states have same county name', { county, states: statesWithThisCounty });
            }
            setMultipleStatesWarning(true);
            setMatchingStates(statesWithThisCounty);
          } else {
            setMultipleStatesWarning(false);
          }
        }

        setBookshops(filteredBookshops);
      } catch (err) {
        const errorObj = err instanceof Error ? err : new Error(String(err));
        setError(errorObj);
        setIsError(true);
      } finally {
        setIsLoading(false);
      }
    };
    
    if (county) {
      fetchBookshops();
    }
  }, [county, stateFromUrl]);
  
  // For optimized SEO titles and descriptions
  const countyName = county || '';
  // Get full state name for SEO benefits
  const stateAbbr = stateFromUrl || '';
  const stateName = stateFromUrl ? getFullStateName(stateFromUrl) : '';
  const bookshopCount = bookshops.length;
  
  // Generate SEO metadata
  const pageTitle = useMemo(() => {
    if (stateFromUrl) {
      return `Independent Bookshops in ${countyName} County, ${stateName} | Local Bookshop Directory`;
    }
    return `Bookshops in ${countyName} County | Find Local Independent Bookstores`;
  }, [countyName, stateName, stateFromUrl]);
  
  const pageDescription = useMemo(() => {
    if (stateFromUrl) {
      return generateDescription(
        DESCRIPTION_TEMPLATES.county_state,
        { county: countyName, state: stateName }
      );
    }
    
    return generateDescription(
      DESCRIPTION_TEMPLATES.county,
      { county: countyName }
    );
  }, [bookshopCount, countyName, stateName, stateFromUrl]);
  
  const seoKeywords = useMemo(() => {
    const baseKeywords = [
      `bookshops in ${countyName} County`,
      `independent bookstores ${countyName}`,
      `local bookshops ${countyName}`,
      `indie bookstores ${countyName} County`,
      `${countyName} County bookstores`
    ];
    
    if (stateFromUrl) {
      baseKeywords.push(...[
        `${countyName} County ${stateName} bookstores`,
        `independent bookstores in ${countyName} County ${stateName}`,
        `local bookshops ${stateName}`,
        `${stateName} bookshop directory`
      ]);
    }
    
    return baseKeywords;
  }, [countyName, stateName, stateFromUrl]);
  
  const canonicalUrl = useMemo(() => {
    if (stateFromUrl) {
      return `${BASE_URL}/directory/county/${stateFromUrl.toLowerCase()}/${generateSlug(countyName)}`;
    }
    return `${BASE_URL}/directory/county/${generateSlug(countyName)}`;
  }, [countyName, stateAbbr, stateFromUrl]);
  
  // Handle showing bookshop details (direct to bookshop page)
  const handleShowDetails = (id: number) => {
    // Find the bookshop by ID
    const bookshop = bookshops.find(b => b.id === id);
    
    if (bookshop) {
      // Navigate to the bookshop detail page using client-side navigation
      const slug = generateSlugFromName(bookshop.name);
      navigate(`/bookshop/${slug}`);
    }
  };
  
  return (
    <div className="container mx-auto px-4 py-8">
      <SEO 
        title={pageTitle}
        description={pageDescription}
        keywords={seoKeywords}
        canonicalUrl={canonicalUrl}
      />
      
      <div className="mb-6">
        <h1 className="text-3xl md:text-4xl font-serif font-bold text-[#5F4B32] mb-2">
          {stateFromUrl 
            ? `Independent Bookshops in ${countyName} County, ${getFullStateName(stateFromUrl)}` 
            : `Independent Bookshops in ${countyName} County`}
        </h1>
        
        <p className="text-gray-600 mb-6">
          {stateFromUrl
            ? `Discover local bookshops in ${countyName} County, ${getFullStateName(stateFromUrl)}. Browse our directory of independent bookstores in this region.`
            : `Explore independent bookshops in ${countyName} County. Find local indie bookstores in your area.`}
        </p>
        
        {/* Warning message for counties that exist in multiple states */}
        {multipleStatesWarning && matchingStates.length > 1 && (
          <div className="mb-6 bg-amber-50 border border-amber-200 rounded-md p-4">
            <h2 className="text-lg font-medium text-amber-800 mb-2">
              <span className="mr-2">⚠️</span>
              Multiple States Have "{countyName}" County
            </h2>
            <p className="text-amber-700 mb-3">
              We found "{countyName}" County in multiple states. For a more specific view, please select the state you're interested in:
            </p>
            <div className="flex flex-wrap gap-2">
              {matchingStates.map(state => (
                <Link 
                  key={state}
                  to={`/directory/county-state/${generateSlug(countyName)}-${state.toLowerCase()}`}
                  className="inline-block px-3 py-1 bg-amber-100 hover:bg-amber-200 text-amber-800 rounded-md transition-colors"
                >
                  {countyName} County, {getFullStateName(state)}
                </Link>
              ))}
            </div>
          </div>
        )}
        
        {/* Bookshop count display */}
        <div className="flex flex-wrap gap-4 items-center mb-6">
          <span className="text-sm text-gray-500">
            {bookshopCount} bookshop{bookshopCount !== 1 ? 's' : ''} found in {countyName} County
            {stateFromUrl ? `, ${stateName}` : ''}
          </span>
        </div>
      </div>
      
      {/* Interactive Map Section - Styled like directory */}
      {view === "map" && (
        <section className="py-8 md:py-12 lg:py-16">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-6 md:mb-8">
              <h2 className="text-2xl md:text-3xl font-serif font-bold text-[#5F4B32] mb-3 md:mb-4">
                Find Independent Bookshops in {countyName} County
                {stateFromUrl ? `, ${getFullStateName(stateFromUrl)}` : ''}
              </h2>
              <p className="text-base md:text-lg text-gray-700 max-w-3xl mx-auto mb-4 md:mb-6 px-2">
                Use our interactive map to explore indie bookshops in {countyName} County
                {stateFromUrl ? ` in ${getFullStateName(stateFromUrl)}` : ''}.
                Click on any pin to view details about the bookshop.
              </p>
            </div>
            <div className="h-[300px] sm:h-[400px] md:h-[500px] rounded-lg overflow-hidden shadow-lg border border-[#E3E9ED] mb-6 md:mb-8">
              <MapboxMap 
                bookstores={bookshops} 
                onSelectBookshop={handleShowDetails}
              />
            </div>
          </div>
        </section>
      )}
        
      {/* Bookshop table section */}
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="bg-white rounded-lg shadow-md p-4">
          <h2 className="text-xl font-serif font-bold mb-4">
            {bookshopCount} Independent Bookshops in {countyName} County
            {stateFromUrl ? `, ${getFullStateName(stateFromUrl)}` : ''}
          </h2>
          <p className="text-gray-600 mb-6">
            A guide to local bookshops and indie bookstores across {countyName} County
            {stateFromUrl ? ` in ${getFullStateName(stateFromUrl)}` : ''}
          </p>
          
          {isLoading ? (
            <div className="text-center py-10">
              <p className="text-base">Loading indie bookshops in {countyName} County...</p>
            </div>
          ) : isError ? (
            <ErrorDisplay
              error={error || 'Unknown error'}
              message="Unable to load independent bookshops. Please try again later."
              title="Error Loading Bookshops"
              showRetry
              onRetry={() => window.location.reload()}
              size="sm"
            />
          ) : bookshops.length === 0 ? (
            <div className="text-center py-10">
              <p>No local bookshops found in {countyName} County{stateFromUrl ? `, ${getFullStateName(stateFromUrl)}` : ''}.</p>
              <p className="mt-2 mb-4">We're constantly updating our directory of independent bookshops. Check back soon for indie bookstores in {countyName} County{stateFromUrl ? ` in ${getFullStateName(stateFromUrl)}` : ''}.</p>
              
              <div className="flex flex-wrap gap-3 justify-center">
                <Link to="/directory/counties">
                  <Button className="bg-[#2A6B7C] hover:bg-[#2A6B7C]/90 text-white">
                    Browse All Counties
                  </Button>
                </Link>
                {stateFromUrl && (
                  <Link to={`/directory/state/${stateFromUrl.toLowerCase()}`}>
                    <Button className="bg-[#3d6a80] hover:bg-[#3d6a80]/90 text-white">
                      Bookshops in {getFullStateName(stateFromUrl)}
                    </Button>
                  </Link>
                )}
              </div>
            </div>
          ) : (
            <BookshopTable 
              bookshops={bookshops}
              showDetails={handleShowDetails}
              currentPage={currentPage}
              totalPages={Math.ceil(bookshops.length / bookshopsPerPage)}
              onPageChange={(page) => {
                setCurrentPage(page);
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
            />
          )}
        </div>
      </div>
      
      {/* SEO Content Section */}
      {!isLoading && !isError && bookshops.length > 0 && (
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="mt-6 bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-serif font-bold mb-4">About Bookshops in {countyName} County</h2>
            <p className="mb-4">
              {countyName} County is home to a diverse selection of independent bookshops, each with its own unique character and literary focus.
              From cozy neighborhood stores to larger establishments with extensive collections, book lovers will find plenty to explore in this region.
            </p>
            {stateFromUrl && (
              <p className="mb-4">
                The independent bookstore scene in {stateName} reflects the rich literary culture of the state, with {countyName} County
                offering some of the most beloved local bookshops in the area.
              </p>
            )}
            <p>
              Whether you're looking for rare books, the latest bestsellers, or a comfortable reading spot with coffee, 
              the bookshops in {countyName} County provide welcoming spaces for readers of all interests.
            </p>
            
            {stateFromUrl && (
              <div className="mt-6">
                <Link to={`/directory/state/${stateFromUrl.toLowerCase()}`} className="text-blue-600 hover:underline mr-4">
                  All Bookshops in {stateName}
                </Link>
                <Link to="/directory/counties" className="text-blue-600 hover:underline">
                  Browse All Counties
                </Link>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default CountyDirectory;