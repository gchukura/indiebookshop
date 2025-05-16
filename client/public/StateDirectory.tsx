import { useParams, Link } from "wouter";
import { useState, useEffect, useMemo } from "react";
import { Bookstore } from "@shared/schema";
import BookshopCard from "@/components/BookshopCard";
import BookshopDetail from "@/components/BookshopDetail";
import MapboxMap from "@/components/MapboxMap";
import { Button } from "@/components/ui/button";
import { getFullStateName } from "@/lib/stateUtils";
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
  const state = params.state;
  
  // Component state
  const [selectedBookshopId, setSelectedBookshopId] = useState<number | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [view, setView] = useState<"map" | "list">("map");
  const [bookshops, setBookshops] = useState<Bookstore[]>([]);
  const [cities, setCities] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isError, setIsError] = useState(false);
  
  // Get full state name
  const stateAbbr = state || '';
  const fullStateName = getFullStateName(stateAbbr);
  
  // Fetch data when component mounts or state changes
  useEffect(() => {
    if (!stateAbbr) return;
    
    console.log(`Loading data for state: ${stateAbbr}`);
    setIsLoading(true);
    setIsError(false);
    
    // Fetch bookshops for this state
    const fetchData = async () => {
      try {
        // Fetch bookshops
        const response = await fetch(`/api/bookstores/filter?state=${stateAbbr}`);
        if (!response.ok) {
          throw new Error(`Failed to fetch bookshops: ${response.status}`);
        }
        
        const data = await response.json();
        console.log(`Found ${data.length} bookshops for state: ${stateAbbr}`);
        setBookshops(data);
        
        // Fetch cities in this state
        const citiesResponse = await fetch(`/api/states/${stateAbbr}/cities`);
        if (citiesResponse.ok) {
          const citiesData = await citiesResponse.json();
          console.log(`Found ${citiesData.length} cities in ${stateAbbr}`);
          setCities(citiesData);
        }
        
        setIsLoading(false);
      } catch (error) {
        console.error("Error fetching data:", error);
        setIsError(true);
        setIsLoading(false);
      }
    };
    
    fetchData();
  }, [stateAbbr]);
  
  // Generate SEO metadata
  const seoTitle = useMemo(() => {
    return `${fullStateName} Local Bookshops | Independent Bookshops in ${fullStateName}`;
  }, [fullStateName]);
  
  const seoDescription = useMemo(() => {
    return generateDescription(
      DESCRIPTION_TEMPLATES.states, 
      { state: fullStateName }
    );
  }, [fullStateName]);
  
  const seoKeywords = useMemo(() => {
    // Generate location-specific keywords for the state
    return generateLocationKeywords('', fullStateName, 'all', 15);
  }, [fullStateName]);
  
  const canonicalUrl = useMemo(() => {
    return `${BASE_URL}/directory/state/${stateAbbr}`;
  }, [stateAbbr]);

  const handleShowDetails = (id: number) => {
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
          Independent Bookshops in {fullStateName}
        </h1>
        <p className="text-gray-600 mb-6">
          Discover local independent bookshops and indie bookstores across {fullStateName}. Browse our comprehensive directory of bookstores in {fullStateName} to find your next literary destination.
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
            <MapboxMap 
              bookshops={bookshops} 
              height="100%" 
              onMarkerClick={handleShowDetails}
            />
          </div>
        )}
        
        {/* Bookstore Listings Section */}
        <div className={`w-full ${view === "map" ? "md:col-span-6" : "md:col-span-12"}`}>
          <div className="bg-white rounded-lg shadow-md p-4">
            <h2 className="text-xl font-serif font-bold text-[#5F4B32] mb-4">
              {bookshops.length} Independent Bookshops in {fullStateName}
            </h2>
            <h3 className="text-md text-gray-600 mb-3">
              A guide to local bookshops and indie bookstores across {fullStateName}
            </h3>
            
            {isLoading ? (
              <div className="text-center py-10">
                <p>Loading indie bookshops in {fullStateName}...</p>
              </div>
            ) : isError ? (
              <div className="text-center py-10">
                <p>Error loading independent bookshops. Please try again later.</p>
              </div>
            ) : bookshops.length === 0 ? (
              <div className="text-center py-10">
                <p>No local bookshops found in {fullStateName}.</p>
                <p className="mt-2 mb-4">We're constantly updating our directory of independent bookshops across America. Check back soon for indie bookstores in {fullStateName}.</p>
                <Link href="/directory">
                  <Button className="mt-4 bg-[#2A6B7C] hover:bg-[#2A6B7C]/90 text-white">
                    View All Indie Bookshops
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="space-y-4">
                <p className="text-gray-600 mb-4">
                  Browse our list of {bookshops.length} local bookshops in {fullStateName}. Click on any bookshop for more details about these independent bookstores, including location, hours, and special features.
                </p>
                {bookshops.map((bookshop) => (
                  <BookshopCard 
                    key={bookshop.id} 
                    bookstore={bookshop} 
                    showDetails={handleShowDetails} 
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
      
      {/* City Quick Links */}
      <div className="mt-12">
        {cities.length > 0 && (
          <div className="mb-6">
            <h2 className="text-xl font-serif font-bold text-[#5F4B32] mb-3">
              Local Bookshops by City in {fullStateName}
            </h2>
            <p className="text-gray-600 mb-4">
              Browse independent bookshops in {cities.length} cities across {fullStateName}. Click on a city to discover indie bookshops in that location.
            </p>
            <div className="flex flex-wrap gap-2">
              {cities.map((city) => (
                <Link 
                  key={city} 
                  href={`/directory/city/${encodeURIComponent(city)}`}
                  title={`${city} Local Bookshops in ${fullStateName}`}
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
          onClose={handleCloseDetail} 
        />
      )}
    </div>
  );
};

export default StateDirectory;