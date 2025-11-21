import { useParams, Link, useLocation } from "wouter";
import { useState, useEffect, useMemo } from "react";
import { Bookstore } from "@shared/schema";
import BookshopCard from "@/components/BookshopCard";
import BookshopDetail from "@/components/BookshopDetail";
import MapboxMap from "@/components/MapboxMap";
import BookshopTable from "@/components/BookshopTable";
import { ErrorDisplay } from "@/components/ErrorDisplay";
import { Button } from "@/components/ui/button";
import { SEO } from "../components/SEO";
import { 
  BASE_URL, 
  DESCRIPTION_TEMPLATES, 
  generateLocationKeywords,
  generateDescription 
} from "../lib/seo";
import { generateSlugFromName } from "../lib/linkUtils";
import { getFullStateName } from "../lib/stateUtils";
import { PAGINATION } from "@/lib/constants";
import { logger } from "@/lib/logger";

const CityDirectory = () => {
  // Get parameters from URL
  const params = useParams();
  const [_, navigate] = useLocation();
  
  // Handle all URL formats:
  // 1. /directory/city/:state/:city
  // 2. /directory/city/:city 
  // 3. /directory/city-state/:citystate
  
  // Extract city and state parameters
  let cityParam = '';
  let stateParam = '';
  
  // Handle new format: /directory/city/:state/:city
  if (params.state && params.city) {
    stateParam = params.state;
    cityParam = params.city;
    logger.debug('CityDirectory URL format detected', { format: 'state/city', state: stateParam, city: cityParam });
  }
  // Handle city-state combined format: /directory/city-state/:citystate
  else if (params.citystate) {
    const parts = params.citystate.split('-');
    if (parts.length >= 2) {
      // Last part is state
      stateParam = parts[parts.length - 1];
      // Rest is city
      cityParam = parts.slice(0, parts.length - 1).join('-');
      logger.debug('CityDirectory URL format detected', { format: 'city-state', citystate: params.citystate, parsedState: stateParam, parsedCity: cityParam });
    }
  }
  // Handle city-only format: /directory/city/:city
  else if (params.city) {
    cityParam = params.city;
      logger.debug('CityDirectory URL format detected', { format: 'city-only', city: cityParam });
  }
  
  // Convert slug to display name (Boston-ma → Boston)
  const cityFromUrl = cityParam
    ? cityParam.replace(/-/g, ' ')
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ') 
    : '';
  
  // Standardize state parameter (works with both 'ma' and 'massachusetts')
  const stateFromUrl = stateParam ? stateParam.toUpperCase() : '';
  
  // Component state
  const [bookshops, setBookshops] = useState<Bookstore[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isError, setIsError] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [selectedBookshopId, setSelectedBookshopId] = useState<number | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const bookshopsPerPage = PAGINATION.DEFAULT_ITEMS_PER_PAGE;
  
  // Normalized city/state names for display
  const cityName = cityFromUrl || '';
  // State name will be set once bookshops data is loaded
  const [stateName, setStateName] = useState(stateFromUrl ? getFullStateName(stateFromUrl) : '');
  
  // Fetch bookshops based on city name
  useEffect(() => {
    const fetchBookshops = async () => {
      setIsLoading(true);
      setIsError(false);
      
      try {
        // Fetch access token for Mapbox API
        const configResponse = await fetch('/api/config');
        const config = await configResponse.json();
        logger.debug('Mapbox access token received', { hasToken: !!config.mapboxAccessToken });
        
        // Build the endpoint based on whether we have a state or just a city
        let endpoint = '';
        
        if (stateFromUrl) {
          endpoint = `/api/bookstores/filter?city=${encodeURIComponent(cityName)}&state=${encodeURIComponent(stateFromUrl)}`;
        } else {
          endpoint = `/api/bookstores/filter?city=${encodeURIComponent(cityName)}`;
        }
        
        if (process.env.NODE_ENV === 'development') {
          logger.info('Loading bookshops for city', { city: cityName, state: stateFromUrl });
        }
        
        // Fetch bookshops
        const response = await fetch(endpoint);
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        if (process.env.NODE_ENV === 'development') {
          logger.debug('Bookshops loaded for city', { city: cityName, count: data.length });
        }
        setBookshops(data);
        
        // If we don't have a state from the URL but have bookshops with state info,
        // use the state from the first bookshop to get the full state name
        if (data.length > 0 && data[0].state) {
          const bookshopState = data[0].state;
          const fullStateName = getFullStateName(bookshopState);
          logger.debug('Derived state name from bookshop data', { abbreviation: bookshopState, fullName: fullStateName });
          setStateName(fullStateName);
        }
      } catch (error) {
        const errorObj = error instanceof Error ? error : new Error(String(error));
        logger.error('Error fetching bookshops in CityDirectory', errorObj, {
          city: cityFromUrl,
          state: stateFromUrl,
          page: 'CityDirectory'
        });
        setError(errorObj);
        setIsError(true);
      } finally {
        setIsLoading(false);
      }
    };
    
    if (cityName) {
      fetchBookshops();
    }
  }, [cityName, stateFromUrl]);
  
  // Handle showing bookshop details
  const handleShowDetails = (id: number) => {
    // Find the bookshop by ID
    const bookshop = bookshops.find(b => b.id === id);
    
    if (bookshop) {
      // Navigate to the bookshop detail page using client-side navigation
      const slug = generateSlugFromName(bookshop.name);
      navigate(`/bookshop/${slug}`);
    }
  };
  
  // For optimized SEO titles and descriptions
  const seoTitle = useMemo(() => {
    return stateFromUrl 
      ? `Independent Bookshops in ${cityName}, ${stateName} | Local Bookshop Directory`
      : `Bookshops in ${cityName} | Find Local Independent Bookstores`;
  }, [cityName, stateName, stateFromUrl]);
  
  const seoDescription = useMemo(() => {
    if (stateFromUrl && stateName) {
      // Use city_state template when state is available
      return generateDescription(
        DESCRIPTION_TEMPLATES.city_state,
        {
          city: cityName,
          state: stateName,
          bookshopCount: String(bookshops.length)
        }
      );
    } else {
      // Use cities template when only city is available
      return generateDescription(
        DESCRIPTION_TEMPLATES.cities,
        {
          city: cityName,
          bookshopCount: String(bookshops.length)
        }
      );
    }
    
    // Fallback description
    return `Browse our directory of ${bookshops.length} independent bookshops in ${cityName}${stateName ? `, ${stateName}` : ''}. Find local indie bookstores, view their locations, and discover their unique offerings.`;
  }, [cityName, stateName, stateFromUrl, bookshops.length]);
  
  const seoKeywords = useMemo(() => {
    const cityKeywords = [
      `bookshops in ${cityName}`,
      `independent bookstores ${cityName}`,
      `local bookshops ${cityName}`,
      `indie bookstores in ${cityName}`,
      `${cityName} bookstores`
    ];
    
    if (stateFromUrl) {
      return [
        ...cityKeywords,
        `${cityName} ${stateName} bookstores`,
        `independent bookstores in ${cityName} ${stateName}`,
        `local bookshops ${stateName}`,
        `${stateName} bookshop directory`
      ];
    }
    
    return cityKeywords;
  }, [cityName, stateName, stateFromUrl]);
  
  const canonicalUrl = useMemo(() => {
    // Always use the state-in-path format for canonical URLs if state is available
    if (stateFromUrl) {
      // Handle both full state names and abbreviations
      const stateSlug = stateFromUrl.toLowerCase();
      return `${BASE_URL}/directory/city/${stateSlug}/${generateSlugFromName(cityName)}`;
    }
    // If no state is available, use the city-only format
    return `${BASE_URL}/directory/city/${generateSlugFromName(cityName)}`;
  }, [cityName, stateFromUrl]);
  
  return (
    <div className="container mx-auto px-4 py-8">
      <SEO 
        title={seoTitle}
        description={seoDescription}
        keywords={seoKeywords}
        canonicalUrl={canonicalUrl}
      />
      
      <div className="mb-6">
        <h1 className="text-3xl md:text-4xl font-serif font-bold text-[#5F4B32] mb-2">
          Independent Bookshops in {cityName}{stateName ? `, ${stateName}` : ''}
        </h1>
        
        <p className="text-gray-600 mb-6">
          Discover local bookshops in {cityName}{stateName ? `, ${stateName}` : ''}. Browse our directory of independent bookstores in this city.
        </p>
        
        {/* No bookshop count needed since it's in the main heading */}
      </div>

      {/* Bookshop Detail Modal */}
      {selectedBookshopId && (
        <BookshopDetail 
          bookshopId={selectedBookshopId} 
          isOpen={isDetailOpen}
          onClose={() => setIsDetailOpen(false)}
        />
      )}

      {/* Interactive Map Section - Styled like directory */}
      {(
        <section className="py-8 md:py-12 lg:py-16">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-6 md:mb-8">
              <h2 className="text-2xl md:text-3xl font-serif font-bold text-[#5F4B32] mb-3 md:mb-4">
                Find Independent Bookshops in {cityName}
                {stateName ? `, ${stateName}` : ''}
              </h2>
              <p className="text-base md:text-lg text-gray-700 max-w-3xl mx-auto mb-4 md:mb-6 px-2">
                Use our interactive map to explore indie bookshops in {cityName}
                {stateName ? ` in ${stateName}` : ''}.
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
            {bookshops.length} Independent Bookshops in {cityName}{stateName ? `, ${stateName}` : ''}
          </h2>
          <p className="text-gray-600 mb-6">
            A guide to local bookshops and indie bookstores in {cityName}{stateName ? `, ${stateName}` : ''}
          </p>
          
          {isLoading ? (
            <div className="text-center py-10">
              <p className="text-base">Loading indie bookshops in {cityName}...</p>
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
              <p>No local bookshops found in {cityName}{stateName ? `, ${stateName}` : ''}.</p>
              <p className="mt-2 mb-4">We're constantly updating our directory of independent bookshops. Check back soon for indie bookstores in {cityName}.</p>
              <Link to="/directory">
                <Button className="mt-4 bg-[#2A6B7C] hover:bg-[#2A6B7C]/90 text-white">
                  View All Indie Bookshops
                </Button>
              </Link>
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
        <div className="mt-12 bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-serif font-bold mb-4">About Bookshops in {cityName}</h2>
          <p className="mb-4">
            {cityName} is home to {bookshops.length} independent bookshops, each with its own unique character and literary focus.
            From cozy neighborhood stores to larger establishments with extensive collections, book lovers will find plenty to explore in this vibrant city.
          </p>
          {stateFromUrl && (
            <p className="mb-4">
              The independent bookstore scene in {stateName} reflects the rich literary culture of the state, with {cityName}
              offering some of the most beloved local bookshops in the area.
            </p>
          )}
          <p>
            Whether you're looking for rare books, the latest bestsellers, or a comfortable reading spot with coffee, 
            the bookshops in {cityName} provide welcoming spaces for readers of all interests.
          </p>
        </div>
      )}
    </div>
  );
};

export default CityDirectory;