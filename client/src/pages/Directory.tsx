import { useState, useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation, useSearch } from "wouter";
import Hero from "@/components/Hero";
import FilterControls from "@/components/FilterControls";
import BookshopDetail from "@/components/BookshopDetail";
import MapboxMap from "@/components/MapboxMap";
import BookshopTable from "@/components/BookshopTable";
import ErrorBoundary from "@/components/ErrorBoundary";
import { Button } from "@/components/ui/button";
import { Bookstore as Bookshop } from "@shared/schema";
import { SEO } from "../components/SEO";
import { BASE_URL, MAIN_KEYWORDS } from "../lib/seo";
import { statesMatch } from "../lib/stateUtils";

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
  // Show 150 bookshops per page for optimal performance and UX
  const bookshopsPerPage = 150;
  
  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedState, selectedCity, selectedCounty, searchQuery]);
  
  // Fetch all bookshops initially
  const { data: allBookshops, isLoading, isError, error } = useQuery<BookshopWithFeatures[]>({
    queryKey: ['bookshops'],
    queryFn: async () => {
      try {
        const response = await fetch('/api/bookstores');
        if (!response.ok) {
          const errorText = await response.text().catch(() => 'Unknown error');
          throw new Error(`Failed to fetch bookshops: ${response.status} ${errorText}`);
        }
        return response.json();
      } catch (err) {
        console.error('Error fetching bookshops:', err);
        throw err;
      }
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 2,
    retryDelay: 1000,
  });
  
  // Apply filtering logic with performance optimization
  const filteredBookshops = useMemo(() => {
    // Early return if no data
    if (!allBookshops || allBookshops.length === 0) {
      return [];
    }
    
    let filtered = allBookshops;
    
    // Apply filters in order of selectivity (most selective first for better performance)
    // State filter is usually most selective
    if (selectedState) {
      filtered = filtered.filter(bookshop => 
        bookshop.state && statesMatch(bookshop.state, selectedState)
      );
    }
    
    // City filter is very selective
    if (selectedCity) {
      const normalizedCity = selectedCity.toLowerCase().trim();
      filtered = filtered.filter(bookshop => {
        if (!bookshop.city) return false;
        return bookshop.city.toLowerCase().trim() === normalizedCity;
      });
    }
    
    // County filter
    if (selectedCounty) {
      const normalizeCounty = (county: string) => 
        county.toLowerCase().replace(/\s+county$/i, '').trim().replace(/\s+/g, ' ');
      
      const filterCounty = normalizeCounty(selectedCounty);
      
      filtered = filtered.filter(bookshop => {
        if (!bookshop.county) return false;
        const bookshopCounty = normalizeCounty(bookshop.county);
        
        // Use exact match or word boundary matching for better precision
        return bookshopCounty === filterCounty || 
               bookshopCounty.startsWith(filterCounty + ' ') ||
               bookshopCounty.endsWith(' ' + filterCounty) ||
               bookshopCounty.includes(' ' + filterCounty + ' ');
      });
    }
    
    // Search query filter (applied last as it's least selective)
    if (searchQuery) {
      const normalizedQuery = searchQuery.toLowerCase().trim();
      // Only filter if query has meaningful content
      if (normalizedQuery.length > 0) {
        filtered = filtered.filter((bookshop) => {
          const name = bookshop.name?.toLowerCase() || '';
          const city = bookshop.city?.toLowerCase() || '';
          const state = bookshop.state?.toLowerCase() || '';
          
          return name.includes(normalizedQuery) || 
                 city.includes(normalizedQuery) || 
                 state.includes(normalizedQuery);
        });
      }
    }
    
    return filtered;
  }, [allBookshops, selectedState, selectedCity, selectedCounty, searchQuery]);


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
      
      <Hero />
      
      {/* Interactive Map Section - Styled like homepage */}
      <section className="py-8 md:py-12 lg:py-16">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-white rounded-lg p-6 md:p-8 lg:p-10">
            <div className="text-center mb-6 md:mb-8">
            <h2 className="text-2xl md:text-3xl font-serif font-bold text-[#5F4B32] mb-3 md:mb-4">Find Independent Bookshops Near You</h2>
            <p className="text-base md:text-lg text-gray-700 max-w-3xl mx-auto mb-4 md:mb-6 px-2">
              Use our interactive map to explore indie bookshops across America. Click on any pin to view details about the bookshop.
            </p>
          </div>
          <div className="h-[300px] sm:h-[400px] md:h-[500px] rounded-lg overflow-hidden shadow-lg border border-[#E3E9ED] mb-6 md:mb-8">
            <MapboxMap 
              bookstores={filteredBookshops} 
              onSelectBookshop={handleShowDetails}
            />
          </div>
          </div>
        </div>
      </section>
      
      {/* Controls and bookshop table */}
      <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-4 md:py-6">
        {/* Filtering controls */}
        <div className="mb-4 md:mb-6">
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
        <div className="bg-white rounded-lg shadow-md p-3 md:p-4 lg:p-6">
          <h2 className="text-lg md:text-xl lg:text-2xl font-serif font-bold mb-3 md:mb-4">
            {searchQuery 
              ? `Search Results for "${searchQuery}" - Independent Bookshops` 
              : selectedState
                ? `Independent Bookshops in ${selectedState}`
                : "Independent Bookshop Directory - Find Local Indie Bookstores"}
          </h2>
          
          <p className="text-sm md:text-base text-gray-600 mb-4 md:mb-6">
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
            <div className="text-center py-8 md:py-10 px-4">
              <p className="text-base md:text-lg text-red-600 mb-4">
                Error loading bookshops. Please try again later.
              </p>
              {process.env.NODE_ENV === 'development' && error && (
                <details className="text-sm text-gray-500 max-w-2xl mx-auto">
                  <summary className="cursor-pointer mb-2">Error details (development only)</summary>
                  <pre className="text-xs bg-gray-100 p-3 rounded overflow-auto text-left">
                    {error instanceof Error ? error.message : String(error)}
                  </pre>
                </details>
              )}
              <Button 
                className="mt-4 bg-[#2A6B7C] hover:bg-[#2A6B7C]/90 text-white min-h-[44px] px-6 md:px-4"
                onClick={() => window.location.reload()}
              >
                Retry
              </Button>
            </div>
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
      </main>

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