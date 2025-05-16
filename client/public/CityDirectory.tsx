import { useParams, Link } from "wouter";
import { useState, useEffect, useMemo } from "react";
import { Bookstore } from "@shared/schema";
import BookshopCard from "@/components/BookshopCard";
import BookshopDetail from "@/components/BookshopDetail";
import MapboxMap from "@/components/MapboxMap";
import { Button } from "@/components/ui/button";
import { SEO } from "../components/SEO";
import { 
  BASE_URL, 
  DESCRIPTION_TEMPLATES, 
  generateSlug, 
  generateLocationKeywords, 
  generateDescription 
} from "../lib/seo";

const CityDirectory = () => {
  // Get city from URL params
  const params = useParams();
  const city = params.city;
  
  // Component state
  const [selectedBookshopId, setSelectedBookshopId] = useState<number | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [view, setView] = useState<"map" | "list">("map");
  const [bookshops, setBookshops] = useState<Bookstore[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isError, setIsError] = useState(false);
  
  // Fetch data when component mounts or city changes
  useEffect(() => {
    if (!city) return;
    
    console.log(`Loading data for city: ${city}`);
    setIsLoading(true);
    setIsError(false);
    
    // Fetch bookshops for this city
    const fetchData = async () => {
      try {
        // Make sure the city is URL-encoded
        const encodedCity = encodeURIComponent(city);
        
        // Fetch bookshops
        const response = await fetch(`/api/bookstores/filter?city=${encodedCity}`);
        if (!response.ok) {
          throw new Error(`Failed to fetch bookshops: ${response.status}`);
        }
        
        const data = await response.json();
        console.log(`Found ${data.length} bookshops for city: ${city}`);
        setBookshops(data);
        setIsLoading(false);
      } catch (error) {
        console.error("Error fetching data:", error);
        setIsError(true);
        setIsLoading(false);
      }
    };
    
    fetchData();
  }, [city]);
  
  // Get state from the first bookshop (assuming all bookshops in a city are in the same state)
  const state = bookshops.length > 0 ? bookshops[0].state : '';
  
  // Generate SEO metadata
  const cityName = city || '';
  const stateName = state || '';
  
  const seoTitle = useMemo(() => {
    if (stateName) {
      return `${cityName} Local Bookshops | Independent Bookshops in ${cityName}, ${stateName}`;
    }
    return `${cityName} Local Bookshops | Indie Bookshops in ${cityName}`;
  }, [cityName, stateName]);
  
  const seoDescription = useMemo(() => {
    return generateDescription(
      DESCRIPTION_TEMPLATES.city_state, 
      { city: cityName, state: stateName }
    );
  }, [cityName, stateName]);
  
  const seoKeywords = useMemo(() => {
    // Generate location-specific keywords
    return generateLocationKeywords(cityName, stateName, 'all', 15);
  }, [cityName, stateName]);
  
  const canonicalUrl = useMemo(() => {
    return `${BASE_URL}/directory/city/${generateSlug(cityName)}`;
  }, [cityName]);

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
          Independent Bookshops in {cityName}{stateName ? `, ${stateName}` : ''}
        </h1>
        <p className="text-gray-600 mb-6">
          Discover local independent bookshops and indie bookstores in {cityName}{stateName ? `, ${stateName}` : ''}. Browse our comprehensive directory to find your next literary destination.
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
              {bookshops.length} Independent Bookshops in {cityName}
            </h2>
            <h3 className="text-md text-gray-600 mb-3">
              A guide to local bookshops and indie bookstores in {cityName}{stateName ? `, ${stateName}` : ''}
            </h3>
            
            {isLoading ? (
              <div className="text-center py-10">
                <p>Loading indie bookshops in {cityName}...</p>
              </div>
            ) : isError ? (
              <div className="text-center py-10">
                <p>Error loading independent bookshops. Please try again later.</p>
              </div>
            ) : bookshops.length === 0 ? (
              <div className="text-center py-10">
                <p>No local bookshops found in {cityName}.</p>
                <p className="mt-2 mb-4">We're constantly updating our directory of independent bookshops. Check back soon for indie bookstores in {cityName}.</p>
                <Link href="/directory">
                  <Button className="mt-4 bg-[#2A6B7C] hover:bg-[#2A6B7C]/90 text-white">
                    View All Indie Bookshops
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="space-y-4">
                <p className="text-gray-600 mb-4">
                  Browse our list of {bookshops.length} independent bookshops in {cityName}. Click on any bookshop for more details, including location, hours, and special features.
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
      
      {/* Related cities or other navigation elements could go here */}
      
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

export default CityDirectory;