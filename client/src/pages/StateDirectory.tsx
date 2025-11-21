import { useParams, Link, useLocation } from "wouter";
import { useState, useEffect, useMemo } from "react";
import { Bookstore } from "@shared/schema";
import { generateSlugFromName } from "../lib/linkUtils";
import BookshopCard from "@/components/BookshopCard";
import BookshopDetail from "@/components/BookshopDetail";
import MapboxMap from "@/components/MapboxMap";
import BookshopTable from "@/components/BookshopTable";
import { ErrorDisplay } from "@/components/ErrorDisplay";
import { Button } from "@/components/ui/button";
import { getFullStateName, normalizeStateToAbbreviation } from "@/lib/stateUtils";
import { PAGINATION } from "@/lib/constants";
import { SEO } from "../components/SEO";
import { 
  BASE_URL, 
  DESCRIPTION_TEMPLATES, 
  generateSlug, 
  generateLocationKeywords, 
  generateDescription 
} from "../lib/seo";

const StateDirectory = () => {
  // Get state from URL params
  const params = useParams();
  const stateParam = params.state;
  // Normalize state to uppercase abbreviation (handles both "Michigan" and "MI", any case)
  const state = stateParam ? (normalizeStateToAbbreviation(stateParam) || stateParam.toUpperCase()) : '';
  const [_, navigate] = useLocation();
  
  // Get full state name for display
  const fullStateName = getFullStateName(state);
  
  // Component state
  const [bookshops, setBookshops] = useState<Bookstore[]>([]);
  const [cities, setCities] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isError, setIsError] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [selectedBookshopId, setSelectedBookshopId] = useState<number | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const bookshopsPerPage = PAGINATION.DEFAULT_ITEMS_PER_PAGE;
  
  // Fetch bookshops based on state
  useEffect(() => {
    const fetchBookshops = async () => {
      setIsLoading(true);
      setIsError(false);
      
      try {
        // Fetch access token for Mapbox API
        const configResponse = await fetch('/api/config');
        const config = await configResponse.json();
        if (process.env.NODE_ENV === 'development') {
          console.log('Access token received from API:', !!config.mapboxAccessToken);
        }
        
        // Fetch bookshops for this state
        const response = await fetch(`/api/bookstores/filter?state=${state}`);
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        if (process.env.NODE_ENV === 'development') {
          console.log(`Found ${data.length} bookshops for state: ${state}`);
        }
        setBookshops(data);
        
        // Get cities in this state for the directory
        const citiesResponse = await fetch(`/api/states/${state}/cities`);
        
        if (citiesResponse.ok) {
          const citiesData = await citiesResponse.json();
          if (process.env.NODE_ENV === 'development') {
            console.log(`Found ${citiesData.length} cities in ${state}`);
          }
          setCities(citiesData);
        }
      } catch (error) {
        console.error('Error fetching bookshops:', error);
        setIsError(true);
      } finally {
        setIsLoading(false);
      }
    };
    
    if (state) {
      if (process.env.NODE_ENV === 'development') {
        console.log(`Loading data for state: ${state}`);
      }
      fetchBookshops();
    }
  }, [state]);
  
  // Handle showing bookshop details (navigate to detail page)
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
    return `Independent Bookshops in ${fullStateName} | Local Bookshop Directory`;
  }, [fullStateName]);
  
  const seoDescription = useMemo(() => {
    return generateDescription(
      DESCRIPTION_TEMPLATES.states,
      {
        state: fullStateName,
        bookshopCount: String(bookshops.length)
      }
    );
  }, [fullStateName, bookshops.length]);
  
  const seoKeywords = useMemo(() => {
    return [
      `bookshops in ${fullStateName}`,
      `independent bookstores ${fullStateName}`,
      `local bookshops ${fullStateName}`,
      `indie bookstores in ${fullStateName}`,
      `${fullStateName} bookshops`,
      `${fullStateName} indie bookstores`
    ];
  }, [fullStateName]);
  
  const canonicalUrl = useMemo(() => {
    return `${BASE_URL}/directory/state/${state}`;
  }, [state]);
  
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
          Independent Bookshops in {fullStateName}
        </h1>
        
        <p className="text-gray-600 mb-6">
          Discover local independent bookshops across {fullStateName}. Browse our comprehensive directory of indie bookstores in this state.
        </p>
        
        {/* No bookshop count needed since it's in the main heading */}
        
        {/* Cities dropdown/list section */}
        {cities && cities.length > 0 && (
          <div className="mb-8">
            <h2 className="text-xl font-serif font-medium mb-4">Cities with Indie Bookshops in {fullStateName}</h2>
            <div className="flex flex-wrap gap-2">
              {cities.map(city => (
                <Link 
                  key={city}
                  to={`/directory/city/${state.toLowerCase()}/${generateSlug(city)}`}
                >
                  <Button 
                    variant="outline" 
                    size="sm"
                    aria-label={`Browse indie bookshops in ${city}, ${fullStateName}`}
                  >
                    {city}
                  </Button>
                </Link>
              ))}
            </div>
          </div>
        )}
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
                Find Independent Bookshops in {fullStateName}
              </h2>
              <p className="text-base md:text-lg text-gray-700 max-w-3xl mx-auto mb-4 md:mb-6 px-2">
                Use our interactive map to explore indie bookshops in {fullStateName}. 
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
            {bookshops.length} Independent Bookshops in {fullStateName}
          </h2>
          <p className="text-gray-600 mb-6">
            A guide to local bookshops and indie bookstores across {fullStateName}
          </p>
          
          {isLoading ? (
            <div className="text-center py-10">
              <p className="text-base">Loading indie bookshops in {fullStateName}...</p>
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
              <p>No local bookshops found in {fullStateName}.</p>
              <p className="mt-2 mb-4">We're constantly updating our directory of independent bookshops across America. Check back soon for indie bookstores in {fullStateName}.</p>
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
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="mt-6 bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-serif font-bold mb-4">
              About Independent Bookshops in {fullStateName}
            </h2>
            <p className="mb-4">
              {fullStateName} is home to a diverse selection of independent bookshops, each with its own unique character and literary focus.
              From cozy neighborhood stores to larger establishments with extensive collections, book lovers will find plenty to explore in this state.
            </p>
            <p>
              Whether you're looking for rare books, the latest bestsellers, or a comfortable reading spot with coffee, 
              the indie bookshops in {fullStateName} provide welcoming spaces for readers of all interests.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default StateDirectory;