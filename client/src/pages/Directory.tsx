import { useState, useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation, useSearch } from "wouter";
import FilterControls from "@/components/FilterControls";
import BookshopDetail from "@/components/BookshopDetail";
import MapboxMap from "@/components/MapboxMap";
import BookshopTable from "@/components/BookshopTable";
import ErrorBoundary from "@/components/ErrorBoundary";
import { ErrorDisplay } from "@/components/ErrorDisplay";
import { Button } from "@/components/ui/button";
import { Bookstore as Bookshop } from "@shared/schema";
import { SEO } from "../components/SEO";
import { BASE_URL, MAIN_KEYWORDS } from "../lib/seo";
import { statesMatch } from "../lib/stateUtils";
import { logger } from "@/lib/logger";
import { QUERY, PAGINATION } from "@/lib/constants";

// Type for bookshop with flexible featureIds handling
type BookshopWithFeatures = Bookshop & {
  featureIds?: number[] | string | null;
};

const Directory = () => {
  const [selectedBookshopId, setSelectedBookshopId] = useState<number | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [location, setLocation] = useLocation();
  const search = useSearch();
  const searchParams = new URLSearchParams(search);
  const searchQuery = searchParams.get("search") || "";
  
  // State for filters managed directly in this component
  const [selectedState, setSelectedState] = useState<string>("");
  const [selectedCity, setSelectedCity] = useState<string>("");
  const [selectedCounty, setSelectedCounty] = useState<string>("");
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  // Show bookshops per page for optimal performance and UX
  const bookshopsPerPage = PAGINATION.LARGE_ITEMS_PER_PAGE;
  
  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedState, selectedCity, selectedCounty, searchQuery]);
  
  // Determine if we should use server-side filtering
  // Use server-side filtering when any filter is active for better performance
  const hasActiveFilters = !!(selectedState || selectedCity || selectedCounty);
  
  // Build query key for filtered or unfiltered data
  const queryKey = hasActiveFilters
    ? ['bookshops', 'filtered', selectedState, selectedCity, selectedCounty]
    : ['bookshops'];
  
  // Fetch bookshops (filtered server-side if filters are active, otherwise all)
  // This optimization reduces data transfer and improves performance when filters are applied
  const { data: fetchedBookshops, isLoading, isError, error } = useQuery<BookshopWithFeatures[]>({
    queryKey,
    queryFn: async () => {
      try {
        // Build URL based on whether filters are active
        let queryUrl: string;
        if (hasActiveFilters) {
          const params = new URLSearchParams();
          if (selectedState) params.set('state', selectedState);
          if (selectedCity) params.set('city', selectedCity);
          if (selectedCounty) params.set('county', selectedCounty);
          queryUrl = `/api/bookstores/filter?${params.toString()}`;
        } else {
          queryUrl = '/api/bookstores';
        }
        
        const response = await fetch(queryUrl);
        if (!response.ok) {
          const errorText = await response.text().catch(() => 'Unknown error');
          throw new Error(`Failed to fetch bookshops: ${response.status} ${errorText}`);
        }
        return response.json();
      } catch (err) {
        logger.error('Error fetching bookshops', err, { 
          hasActiveFilters, 
          selectedState, 
          selectedCity, 
          selectedCounty 
        });
        throw err;
      }
    },
    staleTime: QUERY.DEFAULT_STALE_TIME,
    retry: 2,
    retryDelay: 1000,
  });
  
  // Apply client-side search query filter (search is always done client-side for instant feedback)
  // This is acceptable since search typically reduces the dataset significantly
  const filteredBookshops = useMemo(() => {
    // Early return if no data
    if (!fetchedBookshops || fetchedBookshops.length === 0) {
      return [];
    }
    
    // If no search query, return the server-filtered results as-is
    if (!searchQuery || searchQuery.trim().length === 0) {
      return fetchedBookshops;
    }
    
    // Apply search query filter client-side for instant feedback
    const normalizedQuery = searchQuery.toLowerCase().trim();
    return fetchedBookshops.filter((bookshop) => {
      const name = bookshop.name?.toLowerCase() || '';
      const city = bookshop.city?.toLowerCase() || '';
      const state = bookshop.state?.toLowerCase() || '';
      
      return name.includes(normalizedQuery) || 
             city.includes(normalizedQuery) || 
             state.includes(normalizedQuery);
    });
  }, [fetchedBookshops, searchQuery]);


  // Generate a slug from bookshop name for SEO-friendly URLs
  const generateSlug = (name: string): string => {
    return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
  };

  const handleShowDetails = (id: number) => {
    // Find the bookshop by ID
    const bookshop = filteredBookshops.find(b => b.id === id);
    
    if (bookshop) {
      // Navigate to the SEO-friendly permalink page using client-side navigation
      const slug = generateSlug(bookshop.name);
      setLocation(`/bookshop/${slug}`);
    } else {
      // Fallback to the modal if bookshop not found
      setSelectedBookshopId(id);
      setIsDetailOpen(true);
    }
  };

  const handleCloseDetail = () => {
    setIsDetailOpen(false);
  };

  // Get paginated bookshops
  const totalPages = Math.max(1, Math.ceil(filteredBookshops.length / bookshopsPerPage));
  // Ensure currentPage is within valid range
  const validCurrentPage = Math.min(Math.max(1, currentPage), totalPages);
  const indexOfLastBookshop = validCurrentPage * bookshopsPerPage;
  const indexOfFirstBookshop = indexOfLastBookshop - bookshopsPerPage;
  const currentBookshops = filteredBookshops.slice(indexOfFirstBookshop, indexOfLastBookshop);
  
  // Update currentPage if it's out of bounds
  useEffect(() => {
    if (currentPage > totalPages && totalPages > 0) {
      setCurrentPage(1);
    }
  }, [currentPage, totalPages]);
  
  // Handle page change
  const handlePageChange = (pageNumber: number) => {
    setCurrentPage(pageNumber);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  
  // SEO metadata
  const seoTitle = useMemo(() => {
    if (searchQuery) {
      return `Search Results for "${searchQuery}" | Independent Bookshop Directory`;
    }
    
    if (selectedState) {
      return `Independent Bookshops in ${selectedState} | Find Local Bookstores`;
    }
    
    return "Independent Bookshop Directory | Find Local Indie Bookstores Near You";
  }, [searchQuery, selectedState]);
  
  const seoDescription = useMemo(() => {
    if (searchQuery) {
      return `Browse search results for "${searchQuery}" in our independent bookshop directory. Find local indie bookstores, their locations, features, and upcoming events.`;
    }
    
    if (selectedState) {
      return `Discover independent bookshops in ${selectedState}. Browse our complete directory of local indie bookstores, view their locations on the map, and find details about each shop.`;
    }
    
    return "Browse our comprehensive directory of independent bookshops across America. Find local indie bookstores near you, view their locations on the map, and discover their unique offerings.";
  }, [searchQuery, selectedState]);
  
  const seoKeywords = useMemo(() => {
    let keywords = [...MAIN_KEYWORDS];
    
    if (selectedState) {
      keywords = keywords.concat([
        `bookshops in ${selectedState}`,
        `independent bookshops in ${selectedState}`,
        `indie bookstores in ${selectedState}`,
        `local bookshops in ${selectedState}`,
        `${selectedState} bookshops`,
        `${selectedState} indie bookstores`
      ]);
    }
    
    return keywords;
  }, [selectedState]);
  
  const canonicalUrl = useMemo(() => {
    return `${BASE_URL}/directory`;
  }, []);
  
  return (
    <ErrorBoundary>
      {/* SEO Component */}
      <SEO 
        title={seoTitle}
        description={seoDescription}
        keywords={seoKeywords}
        canonicalUrl={canonicalUrl}
      />
      
      {/* Simplified Directory Hero */}
      <section className="bg-[#2A6B7C] py-8 md:py-12 px-4 sm:px-6 lg:px-8">
        <div className="container mx-auto">
          <div className="max-w-4xl mx-auto text-center">
            <h1 className="font-serif text-2xl md:text-3xl lg:text-4xl font-bold text-white mb-3 md:mb-4">
              Search Our Directory
            </h1>
            <p className="font-sans text-sm md:text-base text-gray-100">
              Browse 2,000+ independent bookshops by location, filter by features, or explore the interactive map.
            </p>
          </div>
        </div>
      </section>
      
      {/* Interactive Map Section */}
      <section className="py-8 md:py-12 lg:py-16">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-white rounded-lg p-6 md:p-8 lg:p-10">
            <div className="text-center mb-6 md:mb-8">
              <h2 className="text-2xl md:text-3xl font-serif font-bold text-[#5F4B32] mb-3 md:mb-4">
                Find Independent Bookshops Near You
              </h2>
              <p className="text-base md:text-lg text-gray-700 max-w-3xl mx-auto mb-4 md:mb-6 px-2">
                Use our interactive map to explore indie bookshops across America. Click on any pin to view details.
              </p>
            </div>
            <div className="h-[300px] sm:h-[400px] md:h-[500px] rounded-lg overflow-hidden shadow-lg border-4 border-[#2A6B7C] mb-6 md:mb-8">
              <MapboxMap 
                bookstores={filteredBookshops} 
                onSelectBookshop={handleShowDetails}
              />
            </div>
          </div>
        </div>
      </section>
      
      {/* Controls and bookshop table */}
      <section className="py-8 md:py-12 lg:py-16">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          {/* Filtering controls */}
          <div className="mb-6 md:mb-8">
            <FilterControls 
              bookshopCount={filteredBookshops.length}
              onStateChange={setSelectedState}
              onCityChange={setSelectedCity}
              onCountyChange={setSelectedCounty}
              onFeatureChange={() => {}} // Feature filter disabled
              selectedState={selectedState}
              selectedCity={selectedCity}
              selectedCounty={selectedCounty}
              selectedFeature={null} // Feature filter disabled
            />
          </div>
          
          {/* Bookshop table section */}
          <div className="bg-white rounded-lg shadow-md p-6 md:p-8 lg:p-10">
            <h2 className="text-2xl md:text-3xl font-serif font-bold text-[#5F4B32] mb-3 md:mb-4">
            {searchQuery 
              ? `Search Results for "${searchQuery}" - Independent Bookshops` 
              : selectedState
                ? `Independent Bookshops in ${selectedState}`
                : "Independent Bookshop Directory - Find Local Indie Bookstores"}
          </h2>
          
            <p className="text-sm md:text-base text-gray-700 mb-4 md:mb-6">
            {searchQuery 
              ? `Showing matching local bookshops for your search "${searchQuery}". Browse the results below.` 
              : selectedState
                ? `Discover independent bookshops throughout ${selectedState}. View locations on the map or browse the list below.`
                : "Browse our comprehensive directory of independent bookshops across America. Find your next favorite local indie bookshop."}
          </p>
          
          {isLoading ? (
            <div className="text-center py-8 md:py-10">
              <p className="text-base md:text-lg">Loading bookshops...</p>
            </div>
          ) : isError ? (
            <ErrorDisplay
              error={error}
              message="Unable to load bookshops. Please try again later."
              title="Error Loading Bookshops"
              showRetry
              onRetry={() => window.location.reload()}
            />
          ) : filteredBookshops.length === 0 ? (
            <div className="text-center py-8 md:py-10 px-4">
              <p className="text-base md:text-lg mb-4 md:mb-6">No bookshops found matching your criteria.</p>
              <Button 
                className="mt-4 bg-[#2A6B7C] hover:bg-[#2A6B7C]/90 text-white min-h-[44px] px-6 md:px-4"
                onClick={() => {
                  setSelectedState("");
                  setSelectedCity("");
                  setSelectedCounty("");
                  // setSelectedFeature(null); // Category filter temporarily disabled
                  setLocation("/directory");
                }}
              >
                Reset Filters
              </Button>
            </div>
          ) : (
            <BookshopTable 
              bookshops={currentBookshops}
              showDetails={handleShowDetails}
              currentPage={validCurrentPage}
              totalPages={totalPages}
              onPageChange={handlePageChange}
            />
          )}
          </div>
        </div>
      </section>

      {/* Bookshop Detail Modal */}
      {selectedBookshopId && (
        <BookshopDetail 
          bookshopId={selectedBookshopId} 
          isOpen={isDetailOpen} 
          onClose={handleCloseDetail} 
        />
      )}
    </ErrorBoundary>
  );
};

export default Directory;