import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation, useSearch } from "wouter";
import Hero from "@/components/Hero";
import FilterControls from "@/components/FilterControls";
import BookstoreCard from "@/components/BookstoreCard";
import BookstoreDetail from "@/components/BookstoreDetail";
import MapboxMap from "@/components/MapboxMap";
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

  return (
    <>
      <Hero />
      <FilterControls 
        view={view} 
        setView={setView} 
        bookstoreCount={filteredBookstores.length}
      />
      <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="md:flex md:space-x-6">
          {/* Map Section */}
          <div id="map-section" className={`w-full ${view === "map" ? "md:w-1/2" : "md:hidden"}`}>
            <div className="bg-white rounded-lg shadow-md overflow-hidden map-container relative" style={{ height: "600px" }}>
              <MapboxMap 
                bookstores={filteredBookstores} 
                onSelectBookstore={handleShowDetails}
              />
            </div>
          </div>

          {/* Bookstore Listings Section */}
          <div 
            id="listings-section" 
            className={`w-full ${view === "list" ? "md:w-full" : view === "map" ? "md:w-1/2" : ""} mt-6 md:mt-0`}
          >
            <div className="bg-white rounded-lg shadow-md p-4 h-full overflow-y-auto" style={{ maxHeight: "800px" }}>
              <h2 className="text-xl font-serif font-bold mb-4">
                {searchQuery 
                  ? `Search Results for "${searchQuery}"` 
                  : "Featured Bookstores"}
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
                <>
                  {filteredBookstores.map((bookstore) => (
                    <BookstoreCard 
                      key={bookstore.id} 
                      bookstore={bookstore} 
                      showDetails={handleShowDetails} 
                    />
                  ))}
                  
                  {filteredBookstores.length >= 10 && (
                    <div className="mt-6 text-center">
                      <Button className="bg-[#2A6B7C] hover:bg-[#2A6B7C]/90 text-white px-6 py-2 rounded-md font-medium">
                        Load More Bookstores
                      </Button>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
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