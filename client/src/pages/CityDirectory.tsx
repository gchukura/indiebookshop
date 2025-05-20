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
  // Get city and state from URL params
  const params = useParams();
  const city = params.city;
  const stateFromUrl = params.state;
  
  // Component state
  const [selectedBookshopId, setSelectedBookshopId] = useState<number | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [view, setView] = useState<"map" | "list">("map");
  const [bookshops, setBookshops] = useState<Bookstore[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isError, setIsError] = useState(false);
  
  // Format city name for better compatibility with data
  const formattedCity = useMemo(() => {
    if (!city) return '';
    
    // Replace hyphens with spaces
    let formatted = city.replace(/-/g, ' ');
    
    // Convert to Title Case for consistent formatting
    formatted = formatted.split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
      
    return formatted;
  }, [city]);

  // Fetch data when component mounts or city changes
  useEffect(() => {
    if (!city) return;
    
    console.log(`Loading data for city: ${formattedCity}`);
    setIsLoading(true);
    setIsError(false);
    
    // Fetch bookshops for this city
    const fetchData = async () => {
      try {
        // Make sure the city and state are URL-encoded
        const encodedCity = encodeURIComponent(formattedCity);
        
        // Build the query URL with optional state parameter
        let queryUrl = `/api/bookstores/filter?city=${encodedCity}`;
        
        // Add state parameter if available from URL
        if (stateFromUrl) {
          queryUrl += `&state=${encodeURIComponent(stateFromUrl)}`;
        }
        
        // Fetch bookshops
        const response = await fetch(queryUrl);
        if (!response.ok) {
          throw new Error(`Failed to fetch bookshops: ${response.status}`);
        }
        
        const data = await response.json();
        console.log(`Found ${data.length} bookshops for city: ${formattedCity}`);
        setBookshops(data);
        setIsLoading(false);
      } catch (error) {
        console.error("Error fetching data:", error);
        setIsError(true);
        setIsLoading(false);
      }
    };
    
    fetchData();
  }, [city, formattedCity, stateFromUrl]);
  
  // Get state from the first bookshop (assuming all bookshops in a city are in the same state)
  const state = bookshops.length > 0 ? bookshops[0].state : '';
  
  // Generate SEO metadata
  const cityName = formattedCity || '';
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
          {city} Local Bookshops{state ? ` in ${state}` : ''}
        </h1>
        <p className="text-gray-600 mb-6">
          Discover indie bookshops in {city}{state ? `, ${state}` : ''}. Browse our list of independent bookshops with our map or list view to find your next favorite local bookshop.
        </p>
        
        {/* Breadcrumb Navigation */}
        {state && (
          <div className="flex items-center text-sm mb-6">
            <Link href="/directory">
              <span className="text-[#2A6B7C] hover:underline">Directory</span>
            </Link>
            <span className="mx-2">›</span>
            <Link href={`/directory/state/${state}`} title={`${state} Local Bookshops`}>
              <span className="text-[#2A6B7C] hover:underline">{state}</span>
            </Link>
            <span className="mx-2">›</span>
            <span className="font-medium">{city} Bookshops</span>
          </div>
        )}
        
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
                bookstores={bookshops} 
                onSelectBookshop={handleShowDetails}
              />
            </div>
          </div>
        )}

        {/* Bookshop Listings Section */}
        <div className={`w-full ${view === "map" ? "md:w-1/2" : "md:w-full"}`}>
          <div className="bg-white rounded-lg shadow-md p-4">
            <h2 className="text-xl font-serif font-bold text-[#5F4B32] mb-4">
              {bookshops.length} Local Bookshops in {cityName}
            </h2>
            <h3 className="text-md text-gray-600 mb-6">
              A guide to independent bookshops and indie bookstores in {cityName}{stateName ? `, ${stateName}` : ''}
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
                <p className="mt-2 mb-4">We're constantly updating our directory of independent bookshops across America. Check back soon for indie bookstores in {cityName}.</p>
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

      {/* Bookshop Detail Modal */}
      {selectedBookshopId && (
        <BookshopDetail 
          bookshopId={selectedBookshopId} 
          isOpen={isDetailOpen} 
          onClose={handleCloseDetail} 
        />
      )}
      
      {/* SEO Content Section */}
      <section className="mt-12 bg-[#F7F3E8] rounded-lg p-6">
        <h2 className="text-2xl font-serif font-bold text-[#5F4B32] mb-4">
          Exploring Independent Bookshops in {cityName}
        </h2>
        <div className="prose prose-p:text-gray-700 max-w-none">
          <p>
            {cityName}{stateName ? `, ${stateName}` : ''} offers a wonderful selection of local bookshops and indie bookstores for book lovers to explore. Each independent bookshop in {cityName} has its own unique character and specialty, from rare book collections to cozy reading spaces and community events.
          </p>
          <p>
            When looking for the best bookshops in {cityName}, our directory provides a comprehensive list of independent bookshops that you can browse by location or specialty. Whether you're searching for local bookshops near me in {cityName} or want to explore the variety of indie bookshops this city has to offer, our guide connects readers with their next literary destination.
          </p>
          <p>
            The independent bookshops of {cityName} are more than just retail spaces—they're cultural hubs that support local authors, host community events, and offer personalized recommendations you won't find at chain stores. Visit one of these {cityName} bookshops today to experience the difference that passionate, independent booksellers make.
          </p>
        </div>
      </section>
    </div>
  );
};

export default CityDirectory;