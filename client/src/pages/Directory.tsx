import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation, useSearch } from "wouter";
import Hero from "@/components/Hero";
import FilterControls from "@/components/FilterControls";
import BookstoreDetail from "@/components/BookstoreDetail";
import MapboxMap from "@/components/MapboxMap";
import BookstoreTable from "@/components/BookstoreTable";
import { Button } from "@/components/ui/button";
import { Bookstore } from "@shared/schema";
import { useFilters } from "@/hooks/useFilters";
import { useBookstores } from "@/hooks/useBookstores";

const Directory = () => {
  const [view, setView] = useState<"map" | "list">("map");
  const [selectedBookstoreId, setSelectedBookstoreId] = useState<number | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [location, setLocation] = useLocation();
  const search = useSearch();
  const searchParams = new URLSearchParams(search);
  const searchQuery = searchParams.get("search") || "";
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const booksPerPage = 10;
  
  const { filters } = useFilters();
  const { bookstores, isLoading, isError } = useBookstores(filters);
  
  // Filter bookstores by search query locally
  const filteredBookstores = searchQuery
    ? bookstores.filter(
        (bookstore) =>
          bookstore.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          bookstore.city.toLowerCase().includes(searchQuery.toLowerCase()) ||
          bookstore.state.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : bookstores;

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
    setSelectedBookstoreId(id);
    setIsDetailOpen(true);
  };

  const handleCloseDetail = () => {
    setIsDetailOpen(false);
  };

  // Get paginated bookstores
  const indexOfLastBookstore = currentPage * booksPerPage;
  const indexOfFirstBookstore = indexOfLastBookstore - booksPerPage;
  const currentBookstores = filteredBookstores.slice(indexOfFirstBookstore, indexOfLastBookstore);
  const totalPages = Math.ceil(filteredBookstores.length / booksPerPage);
  
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
            bookstores={filteredBookstores} 
            onSelectBookstore={handleShowDetails}
          />
        </div>
      </div>
      
      {/* Controls and bookstore table */}
      <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Filtering controls */}
        <div className="mb-6">
          <FilterControls 
            bookstoreCount={filteredBookstores.length}
          />
        </div>
        
        {/* Bookstore table section */}
        <div className="bg-white rounded-lg shadow-md p-4">
          <h2 className="text-xl font-serif font-bold mb-4">
            {searchQuery 
              ? `Search Results for "${searchQuery}"` 
              : "Bookstore Directory"}
          </h2>
          
          {isLoading ? (
            <div className="text-center py-10">
              <p>Loading bookstores...</p>
            </div>
          ) : isError ? (
            <div className="text-center py-10">
              <p>Error loading bookstores. Please try again later.</p>
            </div>
          ) : filteredBookstores.length === 0 ? (
            <div className="text-center py-10">
              <p>No bookstores found matching your criteria.</p>
              <Button 
                className="mt-4 bg-[#2A6B7C] hover:bg-[#2A6B7C]/90 text-white"
                onClick={() => window.location.href = "/directory"}
              >
                Reset Filters
              </Button>
            </div>
          ) : (
            <BookstoreTable 
              bookstores={currentBookstores}
              showDetails={handleShowDetails}
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={handlePageChange}
            />
          )}
        </div>
      </main>

      {/* Bookstore Detail Modal */}
      {selectedBookstoreId && (
        <BookstoreDetail 
          bookstoreId={selectedBookstoreId} 
          isOpen={isDetailOpen} 
          onClose={handleCloseDetail} 
        />
      )}
    </>
  );
};

export default Directory;