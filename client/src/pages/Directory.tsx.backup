import { useState, useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation, useSearch } from "wouter";
import Hero from "@/components/Hero";
import FilterControls from "@/components/FilterControls";
import BookshopDetail from "@/components/BookshopDetail";
import MapboxMap from "@/components/MapboxMap";
import BookshopTable from "@/components/BookshopTable";
import { Button } from "@/components/ui/button";
import { Bookstore as Bookshop } from "@shared/schema";
import { SEO } from "../components/SEO";
import { BASE_URL, MAIN_KEYWORDS } from "../lib/seo";

// Type for bookshop with flexible featureIds handling
type BookshopWithFeatures = Bookshop & {
  featureIds?: number[] | string | null;
};

const Directory = () => {
  const [view, setView] = useState<"map" | "list">("map");
  const [selectedBookshopId, setSelectedBookshopId] = useState<number | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [location, setLocation] = useLocation();
  const search = useSearch();
  const searchParams = new URLSearchParams(search);
  const searchQuery = searchParams.get("search") || "";
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const bookshopsPerPage = 150;
  
  // State for filters managed directly in this component
  const [selectedState, setSelectedState] = useState<string>("");
  const [selectedFeature, setSelectedFeature] = useState<number | null>(null);
  
  // Fetch all bookshops initially
  const { data: allBookshops, isLoading, isError } = useQuery<BookshopWithFeatures[]>({
    queryKey: ['bookshops'],
    queryFn: async () => {
      const response = await fetch('/api/bookstores');
      if (!response.ok) {
        throw new Error('Failed to fetch bookshops');
      }
      return response.json();
    }
  });
  
  // Apply filtering logic
  const filteredBookshops = useMemo(() => {
    let filtered = allBookshops || [];
    
    // Filter by state if selected
    if (selectedState) {
      filtered = filtered.filter(bookshop => bookshop.state === selectedState);
    }
    
    // Filter by feature if selected
    if (selectedFeature) {
      filtered = filtered.filter(bookshop => {
        // Handle different types of featureIds
        if (!bookshop.featureIds) return false;
        
        // Convert feature IDs to an array of numbers
        let featureIdArray: number[] = [];
        
        if (typeof bookshop.featureIds === 'string') {
          // Handle string format "1,2,3"
          const idStrings = bookshop.featureIds.split(',');
          featureIdArray = idStrings
            .map(idString => parseInt(idString.trim()))
            .filter(id => !isNaN(id));
        } else if (Array.isArray(bookshop.featureIds)) {
          // Handle array format
          featureIdArray = bookshop.featureIds;
        }
        
        return featureIdArray.includes(selectedFeature);
      });
    }
    
    // Filter by search query if present
    if (searchQuery) {
      filtered = filtered.filter(
        (bookshop) =>
          bookshop.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          (bookshop.city && bookshop.city.toLowerCase().includes(searchQuery.toLowerCase())) ||
          (bookshop.state && bookshop.state.toLowerCase().includes(searchQuery.toLowerCase()))
      );
    }
    
    return filtered;
  }, [allBookshops, selectedState, selectedFeature, searchQuery]);

  // Set view from URL parameter on initial load
  useEffect(() => {
    const viewParam = searchParams.get("view");
    if (viewParam === "map" || viewParam === "list") {
      setView(viewParam);
    }
  }, []);

  // Update URL when view changes
  useEffect(() => {
    const newSearchParams = new URLSearchParams(search);
    newSearchParams.set("view", view);
    const newSearch = newSearchParams.toString();
    setLocation(`/directory?${newSearch}`, { replace: true });
  }, [view]);

  // Generate a slug from bookshop name for SEO-friendly URLs
  const generateSlug = (name: string): string => {
    return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
  };

  const handleShowDetails = (id: number) => {
    // Find the bookshop by ID
    const bookshop = filteredBookshops.find(b => b.id === id);
    
    if (bookshop) {
      // Navigate to the SEO-friendly permalink page
      const slug = generateSlug(bookshop.name);
      window.location.href = `/bookshop/${slug}`;
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
  const indexOfLastBookshop = currentPage * bookshopsPerPage;
  const indexOfFirstBookshop = indexOfLastBookshop - bookshopsPerPage;
  const currentBookshops = filteredBookshops.slice(indexOfFirstBookshop, indexOfLastBookshop);
  const totalPages = Math.ceil(filteredBookshops.length / bookshopsPerPage);
  
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
    
    if (selectedState && selectedFeature) {
      return `${selectedState} Bookshops with Special Features | Find Independent Bookstores`;
    }
    
    if (selectedState) {
      return `Independent Bookshops in ${selectedState} | Find Local Bookstores`;
    }
    
    if (selectedFeature) {
      return `Specialty Bookshops | Find Independent Bookstores with Special Features`;
    }
    
    return "Independent Bookshop Directory | Find Local Indie Bookstores Near You";
  }, [searchQuery, selectedState, selectedFeature]);
  
  const seoDescription = useMemo(() => {
    if (searchQuery) {
      return `Browse search results for "${searchQuery}" in our independent bookshop directory. Find local indie bookstores, their locations, features, and upcoming events.`;
    }
    
    if (selectedState && selectedFeature) {
      return `Find ${selectedState} independent bookshops with specialty offerings. Browse our directory of local indie bookstores with special features like coffee shops, rare books, and more.`;
    }
    
    if (selectedState) {
      return `Discover independent bookshops in ${selectedState}. Browse our complete directory of local indie bookstores, view their locations on the map, and find details about each shop.`;
    }
    
    if (selectedFeature) {
      return `Find specialty independent bookshops with unique features. Browse our directory of local indie bookstores that offer special amenities to enhance your book shopping experience.`;
    }
    
    return "Browse our comprehensive directory of independent bookshops across America. Find local indie bookstores near you, view their locations on the map, and discover their unique offerings.";
  }, [searchQuery, selectedState, selectedFeature]);
  
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
    
    if (selectedFeature) {
      keywords = keywords.concat([
        `bookshops with special features`,
        `specialty indie bookstores`,
        `bookshops with coffee shops`,
        `bookstores with rare books`,
        `unique bookshops`,
        `independent bookshops with special amenities`
      ]);
    }
    
    return keywords;
  }, [selectedState, selectedFeature]);
  
  const canonicalUrl = useMemo(() => {
    return `${BASE_URL}/directory`;
  }, []);
  
  return (
    <>
      {/* SEO Component */}
      <SEO 
        title={seoTitle}
        description={seoDescription}
        keywords={seoKeywords}
        canonicalUrl={canonicalUrl}
      />
      
      <Hero />
      
      {/* Interactive Map Section - Styled like homepage */}
      <section className="py-12 bg-white">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-serif font-bold text-[#5F4B32] mb-4">Find Independent Bookshops Near You</h2>
            <p className="text-lg text-gray-700 max-w-3xl mx-auto mb-6">
              Use our interactive map to explore indie bookshops across America. Click on any pin to view details about the bookshop.
            </p>
          </div>
          <div className="h-[500px] rounded-lg overflow-hidden shadow-lg border border-[#E3E9ED] mb-8">
            <MapboxMap 
              bookstores={filteredBookshops} 
              onSelectBookshop={handleShowDetails}
            />
          </div>
        </div>
      </section>
      
      {/* Controls and bookshop table */}
      <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Filtering controls */}
        <div className="mb-6">
          <FilterControls 
            bookshopCount={filteredBookshops.length}
            onStateChange={setSelectedState}
            onFeatureChange={setSelectedFeature}
            selectedState={selectedState}
            selectedFeature={selectedFeature}
          />
        </div>
        
        {/* Bookshop table section */}
        <div className="bg-white rounded-lg shadow-md p-4">
          <h2 className="text-xl font-serif font-bold mb-4">
            {searchQuery 
              ? `Search Results for "${searchQuery}" - Independent Bookshops` 
              : selectedState && selectedFeature
                ? `${selectedState} Independent Bookshops with Special Features`
                : selectedState
                  ? `Independent Bookshops in ${selectedState}`
                  : selectedFeature
                    ? "Specialty Independent Bookshops Directory" 
                    : "Independent Bookshop Directory - Find Local Indie Bookstores"}
          </h2>
          
          <p className="text-gray-600 mb-6">
            {searchQuery 
              ? `Showing matching local bookshops for your search "${searchQuery}". Browse the results below.` 
              : selectedState && selectedFeature
                ? `Browse all indie bookshops in ${selectedState} with specialty features and amenities. Click on any bookshop for more details.`
                : selectedState
                  ? `Discover independent bookshops throughout ${selectedState}. View locations on the map or browse the list below.`
                  : selectedFeature
                    ? "Find independent bookshops with unique specialty features. Explore our directory of indie bookstores with special amenities."
                    : "Browse our comprehensive directory of independent bookshops across America. Find your next favorite local indie bookstore."}
          </p>
          
          {isLoading ? (
            <div className="text-center py-10">
              <p>Loading bookshops...</p>
            </div>
          ) : isError ? (
            <div className="text-center py-10">
              <p>Error loading bookshops. Please try again later.</p>
            </div>
          ) : filteredBookshops.length === 0 ? (
            <div className="text-center py-10">
              <p>No bookshops found matching your criteria.</p>
              <Button 
                className="mt-4 bg-[#2A6B7C] hover:bg-[#2A6B7C]/90 text-white"
                onClick={() => window.location.href = "/directory"}
              >
                Reset Filters
              </Button>
            </div>
          ) : (
            <BookshopTable 
              bookshops={currentBookshops}
              showDetails={handleShowDetails}
              currentPage={currentPage}
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
    </>
  );
};

export default Directory;