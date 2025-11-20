import { useQuery } from "@tanstack/react-query";
import { useState, useMemo } from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import { Bookstore } from "@shared/schema";
import { SEO } from "../components/SEO";
import { BASE_URL, generateLocationKeywords, generateSlug } from "../lib/seo";

// Define major metro areas by region
const METRO_AREAS = {
  "Northeast": [
    { name: "New York", state: "NY" },
    { name: "Boston", state: "MA" },
    { name: "Philadelphia", state: "PA" },
    { name: "Washington", state: "DC" }
  ],
  "Midwest": [
    { name: "Chicago", state: "IL" },
    { name: "Detroit", state: "MI" },
    { name: "Minneapolis", state: "MN" },
    { name: "St. Louis", state: "MO" }
  ],
  "South": [
    { name: "Atlanta", state: "GA" },
    { name: "Miami", state: "FL" },
    { name: "Dallas", state: "TX" },
    { name: "Austin", state: "TX" },
    { name: "Houston", state: "TX" },
    { name: "New Orleans", state: "LA" }
  ],
  "West": [
    { name: "Los Angeles", state: "CA" },
    { name: "San Francisco", state: "CA" },
    { name: "Seattle", state: "WA" },
    { name: "Portland", state: "OR" },
    { name: "Denver", state: "CO" }
  ],
  "Canada": [
    { name: "Toronto", state: "ON" },
    { name: "Vancouver", state: "BC" },
    { name: "Montreal", state: "QC" }
  ]
};

const CitiesListPage = () => {
  const [searchQuery, setSearchQuery] = useState("");
  
  // Fetch bookshop data (we'll use this to count bookshops per city)
  const { data: bookshops = [], isLoading } = useQuery<Bookstore[]>({
    queryKey: ["/api/bookstores"],
  });
  
  // Function to count bookshops for a given city
  const getBookshopCount = (city: string) => {
    return bookshops.filter((b: Bookstore) => b.city?.toLowerCase() === city.toLowerCase()).length;
  };
  
  // Get all metro areas with at least one bookshop
  const metroAreasWithBookshops = Object.entries(METRO_AREAS).reduce((acc, [region, cities]) => {
    const citiesWithBookshops = cities.filter(city => getBookshopCount(city.name) > 0);
    if (citiesWithBookshops.length > 0) {
      acc[region] = citiesWithBookshops;
    }
    return acc;
  }, {} as Record<string, Array<{name: string, state: string}>>);
  
  // Combine all cities for search
  const allCities = Object.values(metroAreasWithBookshops).flat();
  
  // Filter cities based on search query
  const filteredCities = searchQuery 
    ? allCities.filter(city => 
        city.name.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : null;
  
  // SEO metadata
  const seoTitle = useMemo(() => {
    if (searchQuery) {
      return `Find Bookshops in ${searchQuery} | Independent Bookshop Directory by City`;
    }
    return "Browse Independent Bookshops by City | Find Local Bookstores Near You";
  }, [searchQuery]);
  
  const seoDescription = useMemo(() => {
    if (searchQuery) {
      return `Find independent bookshops and local bookstores in cities matching "${searchQuery}". Browse our directory of indie bookshops by metropolitan area.`;
    }
    return "Browse independent bookshops by city. Find local indie bookstores in major metropolitan areas across America, organized by region for easy discovery.";
  }, [searchQuery]);
  
  const seoKeywords = useMemo(() => {
    const baseKeywords = [
      "bookshops by city",
      "independent bookshops by city",
      "indie bookstores by city",
      "find local bookshops",
      "city bookstore directory",
      "metro area bookshops",
      "bookshops in major cities",
      "urban independent bookshops",
      "city bookshop guide"
    ];
    
    // Add city-specific keywords if searching
    if (searchQuery && filteredCities?.length) {
      const cityKeywords = filteredCities.flatMap(city => 
        generateLocationKeywords(city.name, city.state, 'all', 5)
      );
      
      return [...baseKeywords, ...cityKeywords];
    }
    
    // Add region keywords if not searching
    const regionKeywords = Object.keys(metroAreasWithBookshops).map(region => 
      `independent bookshops in ${region}`
    );
    
    // Add some popular city keywords
    const popularCityKeywords = allCities.slice(0, 5).flatMap(city => [
      `bookshops in ${city.name}`,
      `independent bookstores in ${city.name}`
    ]);
    
    return [...baseKeywords, ...regionKeywords, ...popularCityKeywords];
  }, [searchQuery, filteredCities, metroAreasWithBookshops, allCities]);
  
  const canonicalUrl = useMemo(() => {
    return `${BASE_URL}/cities`;
  }, []);

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
        <h1 className="text-2xl md:text-3xl font-serif font-bold text-[#5F4B32] mb-4">
          Search for Independent Bookshops by City
        </h1>
        
        <p className="text-gray-600 mb-6">
          Find local indie bookstores in major metropolitan areas across the country. Browse by region or search for a specific city.
        </p>
        
        {/* Search Bar */}
        <div className="relative max-w-md mb-8">
          <Input
            type="text"
            placeholder="Search for a city..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
        </div>
      </div>
      
      {searchQuery ? (
        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <h2 className="text-2xl font-serif font-bold text-[#5F4B32] mb-4">
            Independent Bookshops in Cities Matching "{searchQuery}"
          </h2>
          
          {filteredCities && filteredCities.length > 0 ? (
            <>
              <p className="text-gray-600 mb-6">
                Discover local independent bookshops in the following cities. Each city listing shows the number of indie bookstores available in our directory.
              </p>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {filteredCities
                  .filter(city => getBookshopCount(city.name) > 0)
                  .map((city, index) => (
                    <Link 
                      key={`${city.name}-${index}`} 
                      href={`/directory/city/${city.state.toLowerCase()}/${generateSlug(city.name)}`}
                    >
                      <Button 
                        variant="outline" 
                        className="w-full justify-start font-medium hover:bg-[#2A6B7C]/5 hover:text-[#2A6B7C] hover:border-[#2A6B7C] transition-colors"
                        aria-label={`Browse ${getBookshopCount(city.name)} independent bookshops in ${city.name}, ${city.state}`}
                      >
                        {city.name}, {city.state}
                        <span className="ml-auto text-xs bg-[#F7F3E8] text-[#5F4B32] px-2 py-0.5 rounded-full">
                          {getBookshopCount(city.name)}
                        </span>
                      </Button>
                    </Link>
                  ))}
              </div>
            </>
          ) : (
            <div className="text-center py-6">
              <p className="mb-4">No cities found matching "{searchQuery}" in our independent bookshop directory.</p>
              <p className="text-gray-600">Try searching for another city name or browse our regional listings below.</p>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-8">
          {/* Major Metro Areas by Region */}
          {Object.keys(metroAreasWithBookshops).map(region => (
            <div key={region} className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-2xl font-serif font-bold text-[#5F4B32] mb-4">
                {region}
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {metroAreasWithBookshops[region as keyof typeof metroAreasWithBookshops]
                  .sort((a, b) => a.name.localeCompare(b.name))
                  .map((city, index) => (
                    <Link 
                      key={`${city.name}-${index}`} 
                      href={`/directory/city/${city.state.toLowerCase()}/${generateSlug(city.name)}`}
                    >
                      <Button 
                        variant="outline" 
                        className="w-full justify-between font-medium hover:bg-[#2A6B7C]/5 hover:text-[#2A6B7C] hover:border-[#2A6B7C] transition-colors"
                      >
                        <span>{city.name}, {city.state}</span>
                        <span className="ml-2 text-xs bg-[#F7F3E8] text-[#5F4B32] px-2 py-0.5 rounded-full">
                          {getBookshopCount(city.name)}
                        </span>
                      </Button>
                    </Link>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default CitiesListPage;