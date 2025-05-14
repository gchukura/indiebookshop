import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import { Bookstore } from "@shared/schema";

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

// We'll dynamically populate notable literary cities based on bookstore count

const CitiesListPage = () => {
  const [searchQuery, setSearchQuery] = useState("");
  
  // Fetch bookstore data (we'll use this to count bookstores per city)
  const { data: bookstores = [], isLoading } = useQuery<Bookstore[]>({
    queryKey: ["/api/bookstores"],
  });
  
  // Function to count bookstores for a given city
  const getBookstoreCount = (city: string) => {
    return bookstores.filter((b: Bookstore) => b.city?.toLowerCase() === city.toLowerCase()).length;
  };
  
  // Function to filter cities based on search query
  const filterCities = (cities: Array<{name: string, state: string}>) => {
    if (!searchQuery) return cities;
    return cities.filter((city: {name: string, state: string}) => 
      city.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
  };
  
  // Get all metro areas with at least one bookstore
  const metroAreasWithBookstores = Object.entries(METRO_AREAS).reduce((acc, [region, cities]) => {
    const citiesWithBookstores = cities.filter(city => getBookstoreCount(city.name) > 0);
    if (citiesWithBookstores.length > 0) {
      acc[region] = citiesWithBookstores;
    }
    return acc;
  }, {} as Record<string, Array<{name: string, state: string}>>);
  
  // Find literary cities (cities with 3+ bookstores that aren't in metro areas)
  const getNotableLiteraryCities = () => {
    const metroAreaNames = new Set(
      Object.values(METRO_AREAS).flat().map(city => city.name.toLowerCase())
    );
    
    // Get all cities from bookstores
    const cityMap = new Map<string, {count: number, state: string}>();
    
    bookstores.forEach(bookstore => {
      if (bookstore.city && bookstore.state) {
        const cityKey = bookstore.city.toLowerCase();
        if (!metroAreaNames.has(cityKey)) {
          const existing = cityMap.get(cityKey);
          if (existing) {
            existing.count += 1;
          } else {
            cityMap.set(cityKey, { count: 1, state: bookstore.state });
          }
        }
      }
    });
    
    // Convert to array and filter for cities with 3+ bookstores
    return Array.from(cityMap.entries())
      .filter(([_, data]) => data.count >= 3)
      .map(([cityName, data]) => ({ 
        name: cityName.charAt(0).toUpperCase() + cityName.slice(1), 
        state: data.state 
      }))
      .sort((a, b) => a.name.localeCompare(b.name));
  };
  
  const notableLiteraryCities = getNotableLiteraryCities();
  
  // Combine all cities for search
  const allCities = [
    ...Object.values(metroAreasWithBookstores).flat(),
    ...notableLiteraryCities
  ];
  
  const filteredCities = searchQuery ? filterCities(allCities) : null;

  return (
    <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-serif font-bold text-[#5F4B32] mb-4">
          Browse Bookstores by City
        </h1>
        <p className="text-gray-600 mb-6">
          Find independent bookstores in major cities across North America, or search for a specific city.
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
            Search Results
          </h2>
          {filteredCities && filteredCities.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {filteredCities
                .filter(city => getBookstoreCount(city.name) > 0)
                .map((city, index) => (
                  <Link 
                    key={`${city.name}-${index}`} 
                    href={`/directory/city/${city.name}`}
                  >
                    <Button 
                      variant="outline" 
                      className="w-full justify-start font-medium hover:bg-[#2A6B7C]/5 hover:text-[#2A6B7C] hover:border-[#2A6B7C] transition-colors"
                    >
                      {city.name}, {city.state}
                      <span className="ml-auto text-xs bg-[#F7F3E8] text-[#5F4B32] px-2 py-0.5 rounded-full">
                        {getBookstoreCount(city.name)}
                      </span>
                    </Button>
                  </Link>
                ))}
            </div>
          ) : (
            <p>No cities found matching "{searchQuery}"</p>
          )}
        </div>
      ) : (
        <div className="space-y-8">
          {/* Major Metro Areas by Region */}
          {Object.keys(metroAreasWithBookstores).map(region => (
            <div key={region} className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-2xl font-serif font-bold text-[#5F4B32] mb-4">
                {region}
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {metroAreasWithBookstores[region as keyof typeof metroAreasWithBookstores]
                  .sort((a, b) => a.name.localeCompare(b.name))
                  .map((city, index) => (
                    <Link 
                      key={`${city.name}-${index}`} 
                      href={`/directory/city/${city.name}`}
                    >
                      <Button 
                        variant="outline" 
                        className="w-full justify-between font-medium hover:bg-[#2A6B7C]/5 hover:text-[#2A6B7C] hover:border-[#2A6B7C] transition-colors"
                      >
                        <span>{city.name}, {city.state}</span>
                        <span className="ml-2 text-xs bg-[#F7F3E8] text-[#5F4B32] px-2 py-0.5 rounded-full">
                          {getBookstoreCount(city.name)}
                        </span>
                      </Button>
                    </Link>
                ))}
              </div>
            </div>
          ))}
          
          {/* Literary Cities Section */}
          {notableLiteraryCities.length > 0 && (
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-2xl font-serif font-bold text-[#5F4B32] mb-4">
                Notable Literary Cities
              </h2>
              <p className="text-gray-600 mb-4">
                Cities with 3+ independent bookstores:
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {notableLiteraryCities.map((city, index) => (
                  <Link 
                    key={`${city.name}-${index}`} 
                    href={`/directory/city/${city.name}`}
                  >
                    <Button 
                      variant="outline" 
                      className="w-full justify-between font-medium hover:bg-[#2A6B7C]/5 hover:text-[#2A6B7C] hover:border-[#2A6B7C] transition-colors"
                    >
                      <span>{city.name}, {city.state}</span>
                      <span className="ml-2 text-xs bg-[#F7F3E8] text-[#5F4B32] px-2 py-0.5 rounded-full">
                        {getBookstoreCount(city.name)}
                      </span>
                    </Button>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default CitiesListPage;