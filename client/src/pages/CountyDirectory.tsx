import { useParams, Link } from "wouter";
import { useState, useEffect, useMemo } from "react";
import { Bookstore } from "@shared/schema";
import BookshopCard from "@/components/BookshopCard";
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

const CountyDirectory = () => {
  // Get parameters from URL
  const params = useParams();
  
  // Handle both routing patterns
  let county = params.county;
  let stateFromUrl: string | undefined;
  
  // If we're using the county-state combined format
  if (params.countystate && !county) {
    // Parse the combined parameter (orange-california)
    const parts = params.countystate.split('-');
    if (parts.length >= 2) {
      // Last part is the state
      const stateIndex = parts.length - 1;
      stateFromUrl = parts[stateIndex];
      
      // Everything before the last part is the county, replace hyphens with spaces
      county = parts.slice(0, stateIndex).join(' ').replace(/-/g, ' ');
      
      console.log(`Parsed county-state URL: county=${county}, state=${stateFromUrl}`);
    } else {
      county = params.countystate;
    }
  }
  
  // Component state
  const [view, setView] = useState<"map" | "list">("map");
  const [bookshops, setBookshops] = useState<Bookstore[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isError, setIsError] = useState(false);
  
  // Fetch bookshops based on county and possibly state
  useEffect(() => {
    const fetchBookshops = async () => {
      setIsLoading(true);
      setIsError(false);
      
      try {
        let endpoint = '';
        
        if (stateFromUrl) {
          // If we have a state, use county-state endpoint
          endpoint = `/api/bookstores/county-state/${generateSlug(county!)}-${generateSlug(stateFromUrl)}`;
          console.log(`Loading data for county: ${county}, state: ${stateFromUrl}`);
        } else {
          // Otherwise just use county endpoint
          endpoint = `/api/bookstores/county/${county}`;
          console.log(`Loading data for county: ${county}`);
        }
        
        const response = await fetch(endpoint);
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        console.log(`Found ${data.length} bookshops for county: ${county}`);
        setBookshops(data);
      } catch (error) {
        console.error('Error fetching bookshops:', error);
        setIsError(true);
      } finally {
        setIsLoading(false);
      }
    };
    
    if (county) {
      fetchBookshops();
    }
  }, [county, stateFromUrl]);
  
  // For optimized SEO titles and descriptions
  const countyName = county || '';
  const stateName = stateFromUrl || '';
  const bookshopCount = bookshops.length;
  
  // Generate SEO metadata
  const pageTitle = useMemo(() => {
    if (stateFromUrl) {
      return `Independent Bookshops in ${countyName} County, ${stateName} | Local Bookstore Directory`;
    }
    return `Bookshops in ${countyName} County | Find Local Independent Bookstores`;
  }, [countyName, stateName, stateFromUrl]);
  
  const pageDescription = useMemo(() => {
    if (stateFromUrl) {
      return generateDescription(
        DESCRIPTION_TEMPLATES.county_state,
        { county: countyName, state: stateName }
      );
    }
    
    return generateDescription(
      DESCRIPTION_TEMPLATES.county,
      { county: countyName }
    );
  }, [bookshopCount, countyName, stateName, stateFromUrl]);
  
  const seoKeywords = useMemo(() => {
    const baseKeywords = [
      `bookshops in ${countyName} County`,
      `independent bookstores ${countyName}`,
      `local bookshops ${countyName}`,
      `indie bookstores ${countyName} County`,
      `${countyName} County bookstores`
    ];
    
    if (stateFromUrl) {
      baseKeywords.push(...[
        `${countyName} County ${stateName} bookstores`,
        `independent bookstores in ${countyName} County ${stateName}`,
        `local bookshops ${stateName}`,
        `${stateName} bookstore directory`
      ]);
    }
    
    return baseKeywords;
  }, [countyName, stateName, stateFromUrl]);
  
  const canonicalUrl = useMemo(() => {
    if (stateFromUrl) {
      return `${BASE_URL}/directory/county-state/${generateSlug(countyName)}-${generateSlug(stateName)}`;
    }
    return `${BASE_URL}/directory/county/${generateSlug(countyName)}`;
  }, [countyName, stateName, stateFromUrl]);
  
  // Handle showing bookshop details (direct to bookshop page)
  const handleShowDetails = (id: number) => {
    // Find the bookshop by ID
    const bookshop = bookshops.find(b => b.id === id);
    
    if (bookshop) {
      // Use the proper slug generation from linkUtils
      const bookshopUrl = generateBookshopSlug(bookshop.id, bookshop.name);
      setLocation(bookshopUrl);
    }
  };
  
  return (
    <div className="container mx-auto px-4 py-8">
      <SEO 
        title={pageTitle}
        description={pageDescription}
        keywords={seoKeywords}
        canonicalUrl={canonicalUrl}
      />
      
      <div className="mb-6">
        <h1 className="text-3xl md:text-4xl font-serif font-bold text-[#3d6a80] mb-2">
          {stateFromUrl 
            ? `Independent Bookshops in ${countyName} County, ${stateName}` 
            : `Independent Bookshops in ${countyName} County`}
        </h1>
        
        <p className="text-gray-600 mb-6">
          {stateFromUrl
            ? `Discover local bookshops in ${countyName} County, ${stateName}. Browse our directory of independent bookstores in this region.`
            : `Explore independent bookshops in ${countyName} County. Find local indie bookstores in your area.`}
        </p>
        
        {/* View toggle */}
        <div className="flex flex-wrap gap-4 items-center mb-6">
          <div className="bg-gray-100 rounded-lg p-1">
            <button 
              className={`px-4 py-2 rounded-md ${view === 'map' ? 'bg-white shadow-sm' : ''}`}
              onClick={() => setView('map')}
            >
              Map View
            </button>
            <button 
              className={`px-4 py-2 rounded-md ${view === 'list' ? 'bg-white shadow-sm' : ''}`}
              onClick={() => setView('list')}
            >
              List View
            </button>
          </div>
          <span className="text-sm text-gray-500">
            {bookshopCount} bookshop{bookshopCount !== 1 ? 's' : ''} found in {countyName} County
            {stateFromUrl ? `, ${stateName}` : ''}
          </span>
        </div>
      </div>
      
      {/* Main content grid */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
        {view === "map" && (
          <div className="md:col-span-6 h-[500px] lg:h-[600px] bg-gray-100 rounded-lg overflow-hidden">
            <MapboxMap 
              bookstores={bookshops} 
              onSelectBookshop={handleShowDetails}
            />
          </div>
        )}
        
        {/* Bookstore Listings Section */}
        <div className={`w-full ${view === "map" ? "md:col-span-6" : "md:col-span-12"}`}>
          <div className="bg-white rounded-lg shadow-md p-4">
            <h2 className="text-xl font-serif font-bold text-[#5F4B32] mb-4">
              {bookshopCount} Independent Bookshops in {countyName} County
              {stateFromUrl ? `, ${stateName}` : ''}
            </h2>
            <h3 className="text-md text-gray-600 mb-3">
              A guide to local bookshops and indie bookstores across {countyName} County
            </h3>
            
            {isLoading ? (
              <div className="text-center py-10">
                <p>Loading indie bookshops in {countyName} County...</p>
              </div>
            ) : isError ? (
              <div className="text-center py-10">
                <p>Error loading independent bookshops. Please try again later.</p>
              </div>
            ) : bookshops.length === 0 ? (
              <div className="text-center py-10">
                <p>No local bookshops found in {countyName} County.</p>
                <p className="mt-2 mb-4">We're constantly updating our directory of independent bookshops. Check back soon for indie bookstores in {countyName} County.</p>
                
                <Link to="/directory/counties">
                  <Button className="bg-[#2A6B7C] hover:bg-[#2A6B7C]/90 text-white">
                    Browse All Counties
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                {bookshops.map(bookshop => (
                  <BookshopCard 
                    key={bookshop.id} 
                    bookstore={bookshop} 
                    showDetails={() => handleShowDetails(bookshop.id)}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
      
      {/* SEO Content Section */}
      {!isLoading && !isError && bookshops.length > 0 && (
        <div className="mt-12 bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-serif font-bold mb-4">About Bookshops in {countyName} County</h2>
          <p className="mb-4">
            {countyName} County is home to a diverse selection of independent bookshops, each with its own unique character and literary focus.
            From cozy neighborhood stores to larger establishments with extensive collections, book lovers will find plenty to explore in this region.
          </p>
          {stateFromUrl && (
            <p className="mb-4">
              The independent bookstore scene in {stateName} reflects the rich literary culture of the state, with {countyName} County
              offering some of the most beloved local bookshops in the area.
            </p>
          )}
          <p>
            Whether you're looking for rare books, the latest bestsellers, or a comfortable reading spot with coffee, 
            the bookshops in {countyName} County provide welcoming spaces for readers of all interests.
          </p>
          
          {stateFromUrl && (
            <div className="mt-6">
              <Link to={`/directory/state/${generateSlug(stateName)}`} className="text-blue-600 hover:underline mr-4">
                All Bookshops in {stateName}
              </Link>
              <Link to="/directory/counties" className="text-blue-600 hover:underline">
                Browse All Counties
              </Link>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default CountyDirectory;