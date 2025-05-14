import { useState, useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation, useSearch } from "wouter";
import Hero from "@/components/Hero";
import FilterControls from "@/components/FilterControls";
import BookshopDetail from "@/components/BookshopDetail";
import MapboxMap from "@/components/MapboxMap";
import BookshopTable from "@/components/BookshopTable";
import { Button } from "@/components/ui/button";
import { Bookstore } from "@shared/schema";

// Type for bookshop with flexible featureIds handling
type BookshopWithFeatures = Bookstore & {
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

  const handleShowDetails = (id: number) => {
    setSelectedBookshopId(id);
    setIsDetailOpen(true);
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
  
  return (
    <>
      <Hero />
      
      {/* Main map section - Full width */}
      <div className="w-full bg-white">
        <div className="map-container relative" style={{ height: "550px" }}>
          <MapboxMap 
            bookstores={filteredBookshops} 
            onSelectBookshop={handleShowDetails}
          />
        </div>
      </div>
      
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
              ? `Search Results for "${searchQuery}"` 
              : "Bookshop Directory"}
          </h2>
          
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