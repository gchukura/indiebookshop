import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Feature } from "@shared/schema";

const StatesListPage = () => {
  // Fetch all states
  const { data: states = [], isLoading: statesLoading } = useQuery<string[]>({
    queryKey: ["/api/states"],
  });

  // Group states in sections by region for better navigation
  const groupStates = () => {
    const regions = {
      "Northeast": ["CT", "DE", "ME", "MA", "NH", "NJ", "NY", "PA", "RI", "VT"],
      "Midwest": ["IL", "IN", "IA", "KS", "MI", "MN", "MO", "NE", "ND", "OH", "SD", "WI"],
      "South": ["AL", "AR", "FL", "GA", "KY", "LA", "MD", "MS", "NC", "OK", "SC", "TN", "TX", "VA", "WV"],
      "West": ["AK", "AZ", "CA", "CO", "HI", "ID", "MT", "NV", "NM", "OR", "UT", "WA", "WY"],
      "Canada": ["AB", "BC", "MB", "NB", "NL", "NS", "ON", "PE", "QC", "SK", "YT", "NT", "NU"],
      "Other": []
    };
    
    // Create a map for quick lookups
    const regionMap = {};
    Object.keys(regions).forEach(region => {
      regions[region].forEach(state => {
        regionMap[state] = region;
      });
    });
    
    // Group states by region
    const grouped = {};
    Object.keys(regions).forEach(region => {
      grouped[region] = [];
    });
    
    states.forEach(state => {
      const region = regionMap[state] || "Other";
      grouped[region].push(state);
    });
    
    return grouped;
  };
  
  const groupedStates = groupStates();

  return (
    <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-serif font-bold text-[#5F4B32] mb-4">
          Browse Bookstores by State
        </h1>
        <p className="text-gray-600 mb-6">
          Find independent bookstores across the United States and Canada. Select a state to see all the bookstores in that area.
        </p>
      </div>

      {statesLoading ? (
        <div className="text-center py-10">
          <p>Loading states...</p>
        </div>
      ) : (
        <div className="space-y-8">
          {Object.keys(groupedStates).map(region => {
            if (groupedStates[region].length === 0) return null;
            
            return (
              <div key={region} className="bg-white rounded-lg shadow-md p-6">
                <h2 className="text-2xl font-serif font-bold text-[#5F4B32] mb-4">
                  {region}
                </h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                  {groupedStates[region].sort().map(state => (
                    <Link 
                      key={state} 
                      href={`/directory/state/${state}`}
                    >
                      <Button 
                        variant="outline" 
                        className="w-full justify-center text-center font-medium hover:bg-[#2A6B7C]/5 hover:text-[#2A6B7C] hover:border-[#2A6B7C] transition-colors"
                      >
                        {state}
                      </Button>
                    </Link>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
      
      {/* Quick Bookstore Features */}
      <div className="mt-12 bg-[#F8F5F0] rounded-lg shadow-md p-6">
        <h2 className="text-2xl font-serif font-bold text-[#5F4B32] mb-4">
          Bookstore Features
        </h2>
        <p className="text-gray-600 mb-4">
          You can also explore bookstores by their special features:
        </p>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
          <Link href={`/directory/category/1`}>
            <Button variant="outline" className="w-full bg-white">Coffee Shop</Button>
          </Link>
          <Link href={`/directory/category/2`}>
            <Button variant="outline" className="w-full bg-white">Used Books</Button>
          </Link>
          <Link href={`/directory/category/3`}>
            <Button variant="outline" className="w-full bg-white">Rare Books</Button>
          </Link>
          <Link href={`/directory/category/5`}>
            <Button variant="outline" className="w-full bg-white">Author Events</Button>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default StatesListPage;