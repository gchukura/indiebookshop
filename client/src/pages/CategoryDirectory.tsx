import { useParams, Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Bookstore, Feature } from "@shared/schema";
import BookstoreCard from "@/components/BookstoreCard";
import BookshopDetail from "@/components/BookstoreDetail";
import MapboxMap from "@/components/MapboxMap";
import { Button } from "@/components/ui/button";

const CategoryDirectory = () => {
  const { featureId } = useParams();
  const [selectedBookstoreId, setSelectedBookstoreId] = useState<number | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [view, setView] = useState<"map" | "list">("map");
  
  // Fetch the feature information 
  const { data: features = [] } = useQuery<Feature[]>({
    queryKey: ["/api/features"],
  });
  
  const feature = features.find(f => f.id === parseInt(featureId || "0"));
  const featureName = feature?.name || "Category";
  
  // Fetch bookstores with this feature
  const { data: bookstores = [], isLoading, isError } = useQuery<Bookstore[]>({
    queryKey: [`/api/bookstores/filter?features=${featureId}`],
    enabled: !!featureId,
  });

  const handleShowDetails = (id: number) => {
    setSelectedBookstoreId(id);
    setIsDetailOpen(true);
  };

  const handleCloseDetail = () => {
    setIsDetailOpen(false);
  };

  return (
    <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-serif font-bold text-[#5F4B32] mb-4">
          Bookstores with {featureName}
        </h1>
        <p className="text-gray-600 mb-6">
          Discover indie bookstores that offer {featureName.toLowerCase()}. Browse the map or list view to find your next favorite bookshop.
        </p>
        
        {/* Breadcrumb Navigation */}
        <div className="flex items-center text-sm mb-6">
          <Link href="/directory">
            <span className="text-[#2A6B7C] hover:underline">Directory</span>
          </Link>
          <span className="mx-2">›</span>
          <span className="font-medium">{featureName}</span>
        </div>
        
        {/* Toggle View */}
        <div className="flex space-x-2 mb-6">
          <Button 
            variant={view === "map" ? "default" : "outline"} 
            onClick={() => setView("map")}
            className={view === "map" ? "bg-[#2A6B7C] hover:bg-[#2A6B7C]/90" : ""}
          >
            Map View
          </Button>
          <Button 
            variant={view === "list" ? "default" : "outline"} 
            onClick={() => setView("list")}
            className={view === "list" ? "bg-[#2A6B7C] hover:bg-[#2A6B7C]/90" : ""}
          >
            List View
          </Button>
        </div>
      </div>

      <div className="md:flex md:space-x-6">
        {/* Map Section */}
        {view === "map" && (
          <div className="w-full md:w-1/2 mb-6 md:mb-0">
            <div className="bg-white rounded-lg shadow-md overflow-hidden map-container relative" style={{ height: "600px" }}>
              <MapboxMap 
                bookstores={bookstores} 
                onSelectBookstore={handleShowDetails}
              />
            </div>
          </div>
        )}

        {/* Bookstore Listings Section */}
        <div className={`w-full ${view === "map" ? "md:w-1/2" : "md:w-full"}`}>
          <div className="bg-white rounded-lg shadow-md p-4">
            <h2 className="text-xl font-medium mb-4">
              {bookstores.length} Bookstores with {featureName}
            </h2>
            
            {isLoading ? (
              <div className="text-center py-10">
                <p>Loading bookstores...</p>
              </div>
            ) : isError ? (
              <div className="text-center py-10">
                <p>Error loading bookstores. Please try again later.</p>
              </div>
            ) : bookstores.length === 0 ? (
              <div className="text-center py-10">
                <p>No bookstores found with {featureName}.</p>
                <Link href="/directory">
                  <Button className="mt-4 bg-[#2A6B7C] hover:bg-[#2A6B7C]/90 text-white">
                    View All Bookstores
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="space-y-4">
                {bookstores.map((bookstore) => (
                  <BookstoreCard 
                    key={bookstore.id} 
                    bookstore={bookstore} 
                    showDetails={handleShowDetails} 
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Bookshop Detail Modal */}
      {selectedBookstoreId && (
        <BookshopDetail 
          bookstoreId={selectedBookstoreId} 
          isOpen={isDetailOpen} 
          onClose={handleCloseDetail} 
        />
      )}
    </div>
  );
};

export default CategoryDirectory;