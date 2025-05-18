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
  generateLocationKeywords, 
  generateDescription 
} from "@/lib/seo";
import {
  getStateNameFromAbbreviation,
  createSlug,
  createCityDirectoryUrl
} from "@/lib/urlUtils";

const CityDirectory = () => {
  // Get city and state from URL params
  const params = useParams<{ state: string, city: string }>();
  const cityParam = params.city || '';
  const stateParam = params.state || '';
  
  // Component state
  const [selectedBookshopId, setSelectedBookshopId] = useState<number | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [view, setView] = useState<"map" | "list">("map");
  const [bookshops, setBookshops] = useState<Bookstore[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isError, setIsError] = useState(false);
  
  // Fetch data when component mounts or city/state changes
  useEffect(() => {
    if (!cityParam) return;
    
    console.log(`Loading data for city: ${cityParam}, state: ${stateParam}`);
    setIsLoading(true);
    setIsError(false);
    
    // Fetch bookshops for this city
    const fetchData = async () => {
      try {
        // Make sure the city is URL-encoded
        const encodedCity = encodeURIComponent(cityParam);
        
        // Create query URL - if we have a state param, include it
        let queryUrl = `/api/bookstores/filter?city=${encodedCity}`;
        if (stateParam) {
          queryUrl += `&state=${encodeURIComponent(stateParam)}`;
        }
        
        // Fetch bookshops
        const response = await fetch(queryUrl);
        if (!response.ok) {
          throw new Error(`Failed to fetch bookshops: ${response.status}`);
        }
        
        const data = await response.json();
        console.log(`Found ${data.length} bookshops for city: ${cityParam}`);
        setBookshops(data);
        setIsLoading(false);
      } catch (error) {
        console.error("Error fetching data:", error);
        setIsError(true);
        setIsLoading(false);
      }
    };
    
    fetchData();
  }, [cityParam, stateParam]);
  
  // Use state from URL param if available, otherwise get from the first bookshop
  const stateAbbr = stateParam || (bookshops.length > 0 ? bookshops[0].state : '');
  
  // Generate SEO metadata
  const cityName = cityParam || '';
  const stateFullName = getStateNameFromAbbreviation(stateAbbr) || stateAbbr;
  
  const seoTitle = stateFullName 
    ? `${cityName} Local Bookshops | Independent Bookshops in ${cityName}, ${stateFullName}`
    : `${cityName} Local Bookshops | Indie Bookshops in ${cityName}`;
  
  const seoDescription = generateDescription(
    DESCRIPTION_TEMPLATES.cities, 
    { city: cityName }
  );
  
  const seoKeywords = generateLocationKeywords(cityName, stateFullName, 'all', 15);
  
  const canonicalUrl = `${BASE_URL}/bookshops/${createSlug(stateFullName)}/${createSlug(cityName)}`;

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
          Independent Bookshops in {cityName}{stateFullName ? `, ${stateFullName}` : ''}
        </h1>
        <p className="text-gray-600 mb-6">
          Discover local independent bookshops and indie bookstores in {cityName}{stateFullName ? `, ${stateFullName}` : ''}. Browse our comprehensive directory to find your next literary destination.
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
              {bookshops.length} Independent Bookshops in {cityName}
            </h2>
            <h3 className="text-md text-gray-600 mb-3">
              A guide to local bookshops and indie bookstores in {cityName}{stateFullName ? `, ${stateFullName}` : ''}
            </h3>
            
            {isLoading ? (
              <div className="text-center py-10">
                <p>Loading indie bookshops in {cityName}{stateFullName ? `, ${stateFullName}` : ''}...</p>
              </div>
            ) : isError ? (
              <div className="text-center py-10">
                <p>Error loading independent bookshops. Please try again later.</p>
              </div>
            ) : bookshops.length === 0 ? (
              <div className="text-center py-10">
                <p>No local bookshops found in {cityName}{stateFullName ? `, ${stateFullName}` : ''}.</p>
                <p className="mt-2 mb-4">We're constantly updating our directory of independent bookshops. Check back soon for indie bookstores in {cityName}{stateFullName ? `, ${stateFullName}` : ''}.</p>
                <Link href="/directory">
                  <Button className="mt-4 bg-[#2A6B7C] hover:bg-[#2A6B7C]/90 text-white">
                    View All Indie Bookshops
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="space-y-4">
                <p className="text-gray-600 mb-4">
                  Browse our list of {bookshops.length} independent bookshops in {cityName}{stateFullName ? `, ${stateFullName}` : ''}. Click on any bookshop for more details, including location, hours, and special features.
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