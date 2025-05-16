import { useParams, Link } from "wouter";
import { useState, useEffect } from "react";
import { Bookstore } from "@shared/schema";
import BookshopCard from "@/components/BookshopCard";
import BookshopDetail from "@/components/BookshopDetail";
import MapboxMap from "@/components/MapboxMap";
import { Button } from "@/components/ui/button";
import { SEO } from "@/components/SEO";
import { 
  BASE_URL, 
  DESCRIPTION_TEMPLATES, 
  generateSlug, 
  generateLocationKeywords, 
  generateDescription 
} from "@/lib/seo";

const StateDirectory = () => {
  // Get state from URL params
  const params = useParams();
  const state = params.state;
  
  // Component state
  const [selectedBookshopId, setSelectedBookshopId] = useState<number | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [view, setView] = useState<"map" | "list">("map");
  const [bookshops, setBookshops] = useState<Bookstore[]>([]);
  const [cities, setCities] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isError, setIsError] = useState(false);
  
  // Fetch data when component mounts or state changes
  useEffect(() => {
    if (!state) return;
    
    console.log(`Loading data for state: ${state}`);
    setIsLoading(true);
    setIsError(false);
    
    // Fetch bookshops and cities for this state
    const fetchData = async () => {
      try {
        // Make sure the state is URL-encoded
        const encodedState = encodeURIComponent(state);
        
        // Fetch bookshops
        const response = await fetch(`/api/bookstores/filter?state=${encodedState}`);
        if (!response.ok) {
          throw new Error(`Failed to fetch bookshops: ${response.status}`);
        }
        
        const data = await response.json();
        console.log(`Found ${data.length} bookshops for state: ${state}`);
        setBookshops(data);
        
        // Fetch cities in this state
        const citiesResponse = await fetch(`/api/states/${encodedState}/cities`);
        if (!citiesResponse.ok) {
          throw new Error(`Failed to fetch cities: ${citiesResponse.status}`);
        }
        
        const citiesData = await citiesResponse.json();
        console.log(`Found ${citiesData.length} cities in ${state}`);
        setCities(citiesData);
        
        setIsLoading(false);
      } catch (error) {
        console.error("Error fetching data:", error);
        setIsError(true);
        setIsLoading(false);
      }
    };
    
    fetchData();
  }, [state]);
  
  // Generate SEO metadata
  const stateName = state || '';
  
  const seoTitle = `${stateName} Bookshops | Independent Bookshops in ${stateName}`;
  const seoDescription = generateDescription(
    DESCRIPTION_TEMPLATES.states, 
    { state: stateName }
  );
  const seoKeywords = generateLocationKeywords(null, stateName, 'all', 15);
  const canonicalUrl = `${BASE_URL}/directory/state/${generateSlug(stateName)}`;

  const handleSelectBookshop = (id: number) => {
    setSelectedBookshopId(id);
    setIsDetailOpen(true);
  };

  const handleCloseDetail = () => {
    setIsDetailOpen(false);
  };

  return (
    <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* SEO Component */}
      <SEO 
        title={seoTitle}
        description={seoDescription}
        keywords={seoKeywords}
        canonicalUrl={canonicalUrl}
      />
      
      <div className="mb-8">
        <h1 className="text-3xl font-serif font-bold text-[#5F4B32] mb-4">
          Independent Bookshops in {stateName}
        </h1>
        <p className="text-gray-600 mb-6">
          Discover local independent bookshops and indie bookstores in {stateName}. Browse our comprehensive directory to find your next literary destination.
        </p>
        
        {/* View Toggle */}
        <div className="flex mb-6 space-x-2">
          <Button 
            variant={view === "map" ? "default" : "outline"}
            onClick={() => setView("map")}
            className={view === "map" ? "bg-[#2A6B7C] hover:bg-[#2A6B7C]/90 text-white" : ""}
          >
            Map View
          </Button>
          <Button 
            variant={view === "list" ? "default" : "outline"}
            onClick={() => setView("list")}
            className={view === "list" ? "bg-[#2A6B7C] hover:bg-[#2A6B7C]/90 text-white" : ""}
          >
            List View
          </Button>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
        {/* Map Section - conditionally rendered based on view */}
        {view === "map" && bookshops.length > 0 && (
          <div className="md:col-span-6 h-[500px] lg:h-[600px] bg-gray-100 rounded-lg overflow-hidden">
            <div style={{ height: "100%", width: "100%" }}>
              <MapboxMap 
                bookstores={bookshops} 
                onSelectBookshop={handleSelectBookshop}
              />
            </div>
          </div>
        )}
        
        {/* Bookstore Listings Section */}
        <div className={`w-full ${view === "map" ? "md:col-span-6" : "md:col-span-12"}`}>
          <div className="bg-white rounded-lg shadow-md p-4">
            <h2 className="text-xl font-serif font-bold text-[#5F4B32] mb-4">
              {bookshops.length} Independent Bookshops in {stateName}
            </h2>
            <h3 className="text-md text-gray-600 mb-3">
              A guide to local bookshops and indie bookstores in {stateName}
            </h3>
            
            {isLoading ? (
              <div className="text-center py-10">
                <p>Loading indie bookshops in {stateName}...</p>
              </div>
            ) : isError ? (
              <div className="text-center py-10">
                <p>Error loading independent bookshops. Please try again later.</p>
              </div>
            ) : bookshops.length === 0 ? (
              <div className="text-center py-10">
                <p>No local bookshops found in {stateName}.</p>
                <p className="mt-2 mb-4">We're constantly updating our directory of independent bookshops. Check back soon for indie bookstores in {stateName}.</p>
                <Link href="/directory">
                  <Button className="mt-4 bg-[#2A6B7C] hover:bg-[#2A6B7C]/90 text-white">
                    View All Indie Bookshops
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="space-y-4">
                <p className="text-gray-600 mb-4">
                  Browse our list of {bookshops.length} independent bookshops in {stateName}. Click on any bookshop for more details, including location, hours, and special features.
                </p>
                {bookshops.map((bookshop) => (
                  <BookshopCard 
                    key={bookshop.id} 
                    bookstore={bookshop} 
                    showDetails={handleSelectBookshop} 
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
      
      {/* Cities List Section */}
      {cities.length > 0 && !isLoading && !isError && (
        <div className="mt-12">
          <h2 className="text-2xl font-serif font-bold text-[#5F4B32] mb-4">
            Cities in {stateName} with Independent Bookshops
          </h2>
          <p className="text-gray-600 mb-6">
            Browse indie bookshops by city in {stateName}:
          </p>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {cities.map((city) => (
              <Link key={city} href={`/directory/city/${generateSlug(city)}`}>
                <Button 
                  variant="outline" 
                  className="w-full justify-start py-2 px-4 hover:bg-[#2A6B7C]/10"
                >
                  {city}
                </Button>
              </Link>
            ))}
          </div>
        </div>
      )}
      
      {/* Bookshop Detail Modal */}
      {selectedBookshopId && (
        <BookshopDetail 
          bookshopId={selectedBookshopId} 
          isOpen={isDetailOpen} 
          onClose={handleCloseDetail} 
        />
      )}
    </div>
  );
};

export default StateDirectory;